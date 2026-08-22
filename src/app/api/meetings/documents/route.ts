import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getClientFolderIdFromBigin, listWorkDriveFolder, clientSafeZohoMessage, ZohoAuthError } from "@/lib/zoho-workdrive";
import { MEETINGS_FOLDER_NAME } from "@/lib/meetings-folder";

export const dynamic = "force-dynamic";

/** Meeting summary documents for the signed-in client. */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rootFolderId = await getClientFolderIdFromBigin(user.email);
    if (!rootFolderId) {
      return NextResponse.json({ documents: [] });
    }

    const rootItems = await listWorkDriveFolder(rootFolderId);
    const meetingsFolder = rootItems.find(
      (item: any) =>
        item.is_folder && String(item.name).toLowerCase() === MEETINGS_FOLDER_NAME.toLowerCase()
    );

    // No folder yet just means no meeting has been summarised for this client.
    if (!meetingsFolder) {
      return NextResponse.json({ documents: [] });
    }

    const files = await listWorkDriveFolder(meetingsFolder.id);
    const documents = files
      .filter((f: any) => !f.is_folder)
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        modifiedTime: f.modified_time,
      }))
      .sort((a: any, b: any) => (b.modifiedTime || 0) - (a.modifiedTime || 0));

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error("Meeting documents error:", error);
    return NextResponse.json(
      { error: clientSafeZohoMessage(error) },
      { status: error instanceof ZohoAuthError && error.rateLimited ? 503 : 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getClientFolderIdFromBigin,
  listWorkDriveFolder,
  getWorkDriveFileStream,
} from "@/lib/zoho-workdrive";
import { MEETINGS_FOLDER_NAME } from "@/lib/meetings-folder";

export const dynamic = "force-dynamic";

/**
 * Stream one meeting summary to the client who owns it.
 *
 * The containing folder is resolved from the session's email server-side and is
 * never taken from the query string, so a caller cannot reach another client's
 * documents by supplying a folder ID they happen to know.
 */
export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get("fileId");
    if (!fileId) {
      return new NextResponse("Missing fileId", { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const rootFolderId = await getClientFolderIdFromBigin(user.email);
    if (!rootFolderId) {
      return new NextResponse("No WorkDrive folder assigned", { status: 403 });
    }

    const rootItems = await listWorkDriveFolder(rootFolderId);
    const meetingsFolder = rootItems.find(
      (item: any) =>
        item.is_folder && String(item.name).toLowerCase() === MEETINGS_FOLDER_NAME.toLowerCase()
    );
    if (!meetingsFolder) {
      return new NextResponse("Not found", { status: 404 });
    }

    // The requested file must actually live in *this* client's Meetings folder.
    const files = await listWorkDriveFolder(meetingsFolder.id);
    const target = files.find((f: any) => f.id === fileId && !f.is_folder);
    if (!target) {
      return new NextResponse("Not found", { status: 404 });
    }

    const upstream = await getWorkDriveFileStream(fileId);

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") ||
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    const disposition = req.nextUrl.searchParams.get("view") === "true" ? "inline" : "attachment";
    headers.set(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodeURIComponent(target.name)}`
    );
    headers.set("Cache-Control", "private, no-store");

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error: any) {
    console.error("Meeting download error:", error);
    return new NextResponse("Failed to download document", { status: 500 });
  }
}

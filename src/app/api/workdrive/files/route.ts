import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getClientFolderIdFromCRM, listWorkDriveFolder } from "@/lib/zoho-workdrive";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json({ error: "No email associated with user" }, { status: 400 });
    }

    console.log(`[WorkDrive Debug] Looking up WorkDrive folder for email: ${email}`);

    // 1. Get folder ID from CRM
    const folderId = await getClientFolderIdFromCRM(email);
    console.log(`[WorkDrive Debug] Found folderId in CRM: ${folderId}`);
    
    if (!folderId) {
      console.log(`[WorkDrive Debug] No folder assigned for this user.`);
      return NextResponse.json({ files: [], message: "No WorkDrive folder assigned yet." });
    }

    // 2. Fetch files from WorkDrive
    const files = await listWorkDriveFolder(folderId);
    console.log(`[WorkDrive Debug] Fetched ${files.length} files from WorkDrive folder ${folderId}`);

    return NextResponse.json({ files, folderId });
  } catch (error: any) {
    console.error("WorkDrive Files Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch WorkDrive files" },
      { status: 500 }
    );
  }
}

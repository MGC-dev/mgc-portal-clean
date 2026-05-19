import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getClientFolderIdFromCRM, listWorkDriveFolder } from "@/lib/zoho-workdrive";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedFolderId = url.searchParams.get("folderId");

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json({ error: "No email associated with user" }, { status: 400 });
    }

    console.log(`[WorkDrive Debug] Looking up WorkDrive root folder for email: ${email}`);

    // 1. Get root folder ID from CRM
    const rootFolderId = await getClientFolderIdFromCRM(email);
    console.log(`[WorkDrive Debug] Found root folderId in CRM: ${rootFolderId}`);
    
    if (!rootFolderId) {
      console.log(`[WorkDrive Debug] No folder assigned for this user.`);
      return NextResponse.json({ files: [], message: "No WorkDrive folder assigned yet." });
    }

    const folderIdToFetch = requestedFolderId || rootFolderId;

    // 2. Fetch files from WorkDrive
    const files = await listWorkDriveFolder(folderIdToFetch);
    console.log(`[WorkDrive Debug] Fetched ${files.length} items from WorkDrive folder ${folderIdToFetch}`);

    return NextResponse.json({ files, folderId: folderIdToFetch, rootFolderId });
  } catch (error: any) {
    console.error("WorkDrive Files Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch WorkDrive files" },
      { status: 500 }
    );
  }
}

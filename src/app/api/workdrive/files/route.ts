import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getClientFolderIdFromBigin, listWorkDriveFolder } from "@/lib/zoho-workdrive";

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

    // 1. Get root folder ID from Bigin
    const rootFolderId = await getClientFolderIdFromBigin(email);
    
    if (!rootFolderId) {
      return NextResponse.json({ files: [], message: "No WorkDrive folder assigned yet." });
    }

    const folderIdToFetch = requestedFolderId || rootFolderId;

    // 2. Fetch files from WorkDrive
    const files = await listWorkDriveFolder(folderIdToFetch);

    return NextResponse.json({ files, folderId: folderIdToFetch, rootFolderId });
  } catch (error: any) {
    console.error("WorkDrive Files Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch WorkDrive files" },
      { status: 500 }
    );
  }
}

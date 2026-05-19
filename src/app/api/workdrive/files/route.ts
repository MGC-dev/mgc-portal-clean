import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getClientFolderIdFromBigin, listWorkDriveFolder } from "@/lib/zoho-workdrive";

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

    // 1. Get folder ID from Bigin
    const folderId = await getClientFolderIdFromBigin(email);
    if (!folderId) {
      return NextResponse.json({ files: [], message: "No WorkDrive folder assigned yet." });
    }

    // 2. Fetch files from WorkDrive
    const files = await listWorkDriveFolder(folderId);

    return NextResponse.json({ files, folderId });
  } catch (error: any) {
    console.error("WorkDrive Files Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch WorkDrive files" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import { getClientFolderIdFromBigin, listWorkDriveFolder } from "@/lib/zoho-workdrive";

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const clientEmail = url.searchParams.get("email");
    const requestedFolderId = url.searchParams.get("folderId");

    if (!clientEmail && !requestedFolderId) {
      return NextResponse.json({ error: "Missing email or folderId" }, { status: 400 });
    }

    let rootFolderId: string | null = null;
    
    if (clientEmail) {
      rootFolderId = await getClientFolderIdFromBigin(clientEmail);
    }

    const folderIdToFetch = requestedFolderId || rootFolderId;

    if (!folderIdToFetch) {
       return NextResponse.json({ files: [], message: "No WorkDrive folder assigned yet." });
    }

    const files = await listWorkDriveFolder(folderIdToFetch);

    return NextResponse.json({ files, folderId: folderIdToFetch, rootFolderId });
  } catch (error: any) {
    console.error("[admin/workdrive/files] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch WorkDrive files" },
      { status: 500 }
    );
  }
}

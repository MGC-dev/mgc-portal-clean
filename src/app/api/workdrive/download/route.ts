import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getClientFolderIdFromCRM, listWorkDriveFolder, getWorkDriveFileStream, getWorkDriveFolderZipStream } from "@/lib/zoho-workdrive";

export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get("fileId");
    if (!fileId) {
      return new NextResponse("Missing fileId", { status: 400 });
    }

    const isFolder = req.nextUrl.searchParams.get("isFolder") === "true";

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const requestedFolderId = req.nextUrl.searchParams.get("folderId");

    // 1. Get client's root folder ID
    const rootFolderId = await getClientFolderIdFromCRM(user.email);
    if (!rootFolderId) {
      return new NextResponse("No WorkDrive folder assigned", { status: 403 });
    }

    const folderId = requestedFolderId || rootFolderId;
    let targetName = "folder";

    if (isFolder) {
      // Security Check for folders
      if (fileId !== rootFolderId) {
        // Verify folder is within the parent folder
        const files = await listWorkDriveFolder(folderId);
        const targetFolder = files.find((f: any) => f.id === fileId && f.is_folder);
        if (!targetFolder) {
          return new NextResponse("Folder not found or access denied", { status: 404 });
        }
        targetName = targetFolder.name;
      } else {
        targetName = "Shared Files";
      }
    } else {
      // Security Check: verify the requested file exists in the specified folder
      // This prevents IDOR (Insecure Direct Object Reference) at the folder level
      const files = await listWorkDriveFolder(folderId);
      const targetFile = files.find((f: any) => f.id === fileId);
      
      if (!targetFile) {
        return new NextResponse("File not found or access denied", { status: 404 });
      }
      targetName = targetFile.name;
    }

    // 3. Proxy download
    let fileStreamResponse;
    if (isFolder) {
      fileStreamResponse = await getWorkDriveFolderZipStream(fileId);
    } else {
      fileStreamResponse = await getWorkDriveFileStream(fileId);
    }
    
    const isView = req.nextUrl.searchParams.get("view") === "true";

    // Copy headers from Zoho's response, especially Content-Type and Content-Disposition
    const headers = new Headers();
    if (isFolder) {
      headers.set("Content-Type", "application/zip");
    } else if (fileStreamResponse.headers.get("content-type")) {
      headers.set("Content-Type", fileStreamResponse.headers.get("content-type")!);
    } else {
      headers.set("Content-Type", "application/octet-stream");
    }
    
    const safeFilename = encodeURIComponent(targetName);
    
    if (isFolder) {
      headers.set("Content-Disposition", `attachment; filename*=UTF-8''${safeFilename}.zip`);
    } else if (isView) {
      headers.set("Content-Disposition", `inline; filename*=UTF-8''${safeFilename}`);
    } else {
      headers.set("Content-Disposition", `attachment; filename*=UTF-8''${safeFilename}`);
    }

    return new NextResponse(fileStreamResponse.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("WorkDrive Download Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

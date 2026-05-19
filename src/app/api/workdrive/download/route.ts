import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getClientFolderIdFromBigin, listWorkDriveFolder, getWorkDriveFileStream } from "@/lib/zoho-workdrive";

export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get("fileId");
    if (!fileId) {
      return new NextResponse("Missing fileId", { status: 400 });
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Get client's folder ID
    const folderId = await getClientFolderIdFromBigin(user.email);
    if (!folderId) {
      return new NextResponse("No WorkDrive folder assigned", { status: 403 });
    }

    // 2. Security Check: verify the requested file exists in THEIR folder
    // This prevents IDOR (Insecure Direct Object Reference)
    const files = await listWorkDriveFolder(folderId);
    const targetFile = files.find((f: any) => f.id === fileId);
    
    if (!targetFile) {
      return new NextResponse("File not found or access denied", { status: 404 });
    }

    // 3. Proxy download
    const fileStreamResponse = await getWorkDriveFileStream(fileId);
    
    // Copy headers from Zoho's response, especially Content-Type and Content-Disposition
    const headers = new Headers();
    if (fileStreamResponse.headers.get("content-type")) {
      headers.set("Content-Type", fileStreamResponse.headers.get("content-type")!);
    } else {
      headers.set("Content-Type", "application/octet-stream");
    }
    
    if (fileStreamResponse.headers.get("content-disposition")) {
      headers.set("Content-Disposition", fileStreamResponse.headers.get("content-disposition")!);
    } else {
      headers.set("Content-Disposition", `attachment; filename="${targetFile.name || 'document'}"`);
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

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import { getWorkDriveFileStream } from "@/lib/zoho-workdrive";

export async function GET(req: NextRequest) {
  try {
    if (!(await requireAdmin(req))) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const fileId = req.nextUrl.searchParams.get("fileId");
    const fileName = req.nextUrl.searchParams.get("fileName") || "file";
    const isInline = req.nextUrl.searchParams.get("inline") === "true";

    if (!fileId) {
      return new NextResponse("Missing fileId", { status: 400 });
    }

    const fileStreamResponse = await getWorkDriveFileStream(fileId);

    const contentType =
      fileStreamResponse.headers.get("content-type") || "application/octet-stream";

    const safeFilename = encodeURIComponent(fileName);
    const disposition = isInline
      ? `inline; filename*=UTF-8''${safeFilename}`
      : `attachment; filename*=UTF-8''${safeFilename}`;

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", disposition);
    // Allow iframe embedding from same origin
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("Content-Security-Policy", "frame-ancestors 'self'");

    return new NextResponse(fileStreamResponse.body, { status: 200, headers });
  } catch (error: any) {
    console.error("[admin/workdrive/view] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

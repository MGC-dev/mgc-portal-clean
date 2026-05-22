import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import { uploadFileToWorkDrive } from "@/lib/zoho-workdrive";

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const folderId = formData.get("folderId") as string;
    const file = formData.get("file") as File;

    if (!folderId || !file) {
      return NextResponse.json({ error: "Missing folderId or file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFileToWorkDrive(folderId, file.name, buffer);

    return NextResponse.json({ file: result });
  } catch (e: any) {
    console.error("[admin/workdrive/files/upload] Error:", e);
    return NextResponse.json({ error: e.message || "Failed to upload file" }, { status: 500 });
  }
}

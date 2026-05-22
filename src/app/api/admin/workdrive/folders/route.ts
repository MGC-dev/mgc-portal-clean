import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import { createWorkDriveFolder, getBiginContactIdByEmail, updateBiginContactWorkdriveId } from "@/lib/zoho-workdrive";

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { parentFolderId, folderName, clientEmail, isRootClientFolder } = await request.json();

    if (!parentFolderId || !folderName) {
      return NextResponse.json({ error: "Missing parentFolderId or folderName" }, { status: 400 });
    }

    const newFolder = await createWorkDriveFolder(parentFolderId, folderName);

    if (isRootClientFolder && clientEmail) {
      const contactId = await getBiginContactIdByEmail(clientEmail);
      if (contactId) {
        await updateBiginContactWorkdriveId(contactId, newFolder.id);
      }
    }

    return NextResponse.json({ folder: newFolder });
  } catch (e: any) {
    console.error("[admin/workdrive/folders] Error:", e);
    return NextResponse.json({ error: e.message || "Failed to create folder" }, { status: 500 });
  }
}

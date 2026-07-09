import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import { createWorkDriveFolder, getBiginContactIdByEmail, updateBiginContactWorkdriveId } from "@/lib/zoho-workdrive";

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { parentFolderId, folderName, clientEmail, isRootClientFolder } = await request.json();

    let targetParentFolderId = parentFolderId;

    if (isRootClientFolder) {
      targetParentFolderId = process.env.NEXT_PUBLIC_WORKDRIVE_CLIENT_DOCUMENTS_FOLDER_ID;
      if (!targetParentFolderId) {
        return NextResponse.json({ error: "Server configuration missing: NEXT_PUBLIC_WORKDRIVE_CLIENT_DOCUMENTS_FOLDER_ID is not set in environment." }, { status: 500 });
      }
    }

    if (!targetParentFolderId || !folderName) {
      return NextResponse.json({ error: "Missing parentFolderId or folderName" }, { status: 400 });
    }

    const newFolder = await createWorkDriveFolder(targetParentFolderId, folderName);

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

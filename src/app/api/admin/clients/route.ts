import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import {
  ensureClientRootFolder,
  getAllSignedBiginContacts,
  getBiginContactFolderId,
} from "@/lib/zoho-workdrive";

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contacts = await getAllSignedBiginContacts();

    // Clients get their root WorkDrive folder once they are marked Signed in
    // Bigin — not at registration. Provision any that are still missing one,
    // one at a time to stay well inside Zoho's API rate limits.
    const users: any[] = [];
    for (const contact of contacts) {
      if (getBiginContactFolderId(contact)) {
        users.push(contact);
        continue;
      }

      try {
        const folderId = await ensureClientRootFolder(contact);
        users.push(
          folderId ? { ...contact, Zoho_Workdrive_ID: folderId, WorkDrive_Folder_ID: folderId } : contact
        );
      } catch (e) {
        // One client's failure must not hide the whole list.
        console.error(`[admin/clients] Folder provisioning failed for ${contact?.Email || contact?.id}:`, e);
        users.push(contact);
      }
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

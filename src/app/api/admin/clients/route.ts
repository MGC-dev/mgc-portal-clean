import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import { getAllSignedBiginContacts } from "@/lib/zoho-workdrive";

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contacts = await getAllSignedBiginContacts();
    return NextResponse.json({ users: contacts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import { deleteWorkDriveItems } from "@/lib/zoho-workdrive";

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemIds } = await request.json();

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "Missing or invalid itemIds array" }, { status: 400 });
    }

    await deleteWorkDriveItems(itemIds);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[admin/workdrive/files/delete] Error:", e);
    return NextResponse.json({ error: e.message || "Failed to delete items" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const admin = createAdminSupabaseClient();

    const { error: delErr } = await admin.auth.admin.deleteUser(userId as string);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // Cleanup profile (optional; auth delete cascades if FK is to auth.users)
    await admin.from("profiles").delete().eq("id", userId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete user" }, { status: 500 });
  }
}
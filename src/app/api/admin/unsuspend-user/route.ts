import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const admin = createAdminSupabaseClient();
    // Attempt to fully clear ban. Some environments require an explicit zero duration before null.
    const { error: zeroErr } = await admin.auth.admin.updateUserById(userId as string, {
      ban_duration: "0s",
    } as any);
    if (zeroErr) {
      // If zero-duration fails, proceed to try null to clear.
      console.warn("[unsuspend-user] zero-duration clear failed:", zeroErr.message);
    }
    const { error: updErr } = await admin.auth.admin.updateUserById(userId as string, {
      ban_duration: null,
    } as any);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    const { error: profErr } = await admin
      .from("profiles")
      .update({ suspended: false })
      .eq("id", userId);
    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    // Confirm and return updated status for client-side certainty
    const { data: profile, error: fetchErr } = await admin
      .from("profiles")
      .select("id,suspended")
      .eq("id", userId)
      .single();
    if (fetchErr) {
      console.warn("[unsuspend-user] profile fetch after update failed:", fetchErr.message);
    }

    return NextResponse.json({ ok: true, profile });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to unsuspend user" }, { status: 500 });
  }
}
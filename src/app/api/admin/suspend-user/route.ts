import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

// Suspend (ban) user for a given duration; use 'indefinite' for permanent
export async function POST(request: Request) {
  try {
    const { userId, duration } = await request.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Normalize and validate ban duration. Next Auth expects Go-style duration strings,
    // e.g., "1h", "24h", "168h". "indefinite" is NOT supported.
    let banDuration = typeof duration === "string" ? duration.trim() : "";
    if (!banDuration) {
      banDuration = "87600h"; // ~10 years as a long ban
    }
    if (banDuration.toLowerCase() === "indefinite") {
      banDuration = "87600h";
    }
    // Basic validation: only allow numbers followed by h/m/s (Go duration units)
    if (!/^\d+(h|m|s)$/.test(banDuration)) {
      return NextResponse.json({ error: `Invalid format for ban duration: ${banDuration}. Use values like '24h', '168h'.` }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { error: updErr } = await admin.auth.admin.updateUserById(userId as string, {
      ban_duration: banDuration,
    } as any);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    await admin.from("profiles").update({ suspended: true }).eq("id", userId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to suspend user" }, { status: 500 });
  }
}
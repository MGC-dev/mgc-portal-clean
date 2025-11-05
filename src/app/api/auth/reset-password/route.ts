import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { hashCode } from "@/lib/otp-store";

// Basic server-side password validation (align with client expectations)
function isStrongPassword(pw: string): boolean {
  const length = pw.length >= 8;
  const upper = /[A-Z]/.test(pw);
  const lower = /[a-z]/.test(pw);
  const number = /[0-9]/.test(pw);
  const special = /[!@#$%^&*]/.test(pw);
  return length && upper && lower && number && special;
}

// POST /api/auth/reset-password
// Body: { token: string, newPassword: string }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body?.token || "").trim();
    const newPassword = String(body?.newPassword || "").trim();
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Missing token or newPassword" }, { status: 400 });
    }
    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        { error: "Password must be at least 8 chars and include upper, lower, number, and special." },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const codeHash = hashCode(token);

    // Find matching reset token record
    const { data: otps, error: fetchErr } = await admin
      .from("email_otps")
      .select("id,email,expires_at,used,attempts,user_id,metadata,created_at")
      .eq("code_hash", codeHash)
      .eq("used", false)
      .contains("metadata", { purpose: "password_reset" })
      .order("created_at", { ascending: false })
      .limit(1);
    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    const rec = otps?.[0];
    if (!rec) {
      return NextResponse.json({ error: "Invalid or already used reset token" }, { status: 400 });
    }
    const now = Date.now();
    const expiresAt = new Date(rec.expires_at).getTime();
    if (now > expiresAt) {
      await admin.from("email_otps").update({ used: true }).eq("id", rec.id);
      return NextResponse.json({ error: "Reset token expired" }, { status: 400 });
    }

    // Resolve user id (prefer stored user_id; fallback to profiles by email)
    let userId: string | null = rec.user_id || null;
    if (!userId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", rec.email)
        .single();
      userId = profile?.id || null;
    }
    if (!userId) {
      return NextResponse.json({ error: "Cannot resolve user for reset" }, { status: 400 });
    }

    // Update password via Supabase Admin API
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    } as any);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Mark token as used
    const { error: markErr } = await admin
      .from("email_otps")
      .update({ used: true, attempts: (rec.attempts ?? 0) + 1 })
      .eq("id", rec.id);
    if (markErr) {
      // Log and proceed; password was updated successfully
      console.warn("[reset-password] failed to mark token used:", markErr.message);
    }

    return NextResponse.json({ message: "Password has been reset successfully." });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to reset password" }, { status: 500 });
  }
}
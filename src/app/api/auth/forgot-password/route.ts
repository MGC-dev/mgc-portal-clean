import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";
import crypto from "crypto";
import { hashCode } from "@/lib/otp-store";

// POST /api/auth/forgot-password
// Body: { email: string }
// Always responds with a success-style message to avoid email enumeration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmail = body?.email as string | undefined;
    if (!rawEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    const email = rawEmail.trim().toLowerCase();

    const admin = createAdminSupabaseClient();

    // Attempt to find the user profile by email
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id,email")
      .eq("email", email)
      .single();

    // Generate a reset token regardless; but only store/send if profile exists
    const token = crypto.randomBytes(24).toString("hex");
    const codeHash = hashCode(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    if (profile && !profErr) {
      // Store token in durable OTP table with purpose=password_reset
      const { error: insertErr } = await admin.from("email_otps").insert({
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
        metadata: { purpose: "password_reset" },
        user_id: profile.id,
      });
      if (insertErr) {
        // Log and continue to return generic success to the client
        console.error("[forgot-password] insert error:", insertErr.message);
      } else {
        // Send email via Resend if configured
        if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const origin = new URL(request.url);
            const resetUrl = new URL("/register/forgotpassword", `${origin.protocol}//${origin.host}`);
            resetUrl.searchParams.set("token", token);

            const html = `
              <div style="font-family: Arial, sans-serif;">
                <h2>Password Reset</h2>
                <p>We received a request to reset your password.</p>
                <p>Click the link below to set a new password. This link expires in 1 hour:</p>
                <p><a href="${resetUrl.toString()}" target="_blank" rel="noopener noreferrer">Reset your password</a></p>
                <p>If you didn't request this, you can ignore this email.</p>
              </div>
            `;
            const { error: sendErr } = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL,
              to: email,
              subject: "Reset your password",
              html,
            });
            if (sendErr) {
              console.error("[forgot-password] email send error:", sendErr.message);
            }
          } catch (e: any) {
            console.error("[forgot-password] Resend failure:", e?.message || e);
          }
        }
      }
    }

    // Always return a generic success message
    return NextResponse.json({ message: "If the email exists, a reset link has been sent." });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to process request" }, { status: 500 });
  }
}
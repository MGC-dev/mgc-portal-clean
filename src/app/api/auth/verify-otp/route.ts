import { NextResponse } from "next/server";
import { hashCode } from "@/lib/otp-store";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";

// POST /api/auth/verify-otp
// Body: { email: string, code: string }
// Returns: { ok: boolean }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body || {};
    if (!email || !code) {
      return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
    }

    // Normalize email to avoid whitespace/case mismatches
    const normalizedEmail = String(email).trim().toLowerCase();

    const admin = createAdminSupabaseClient();

    const { data: otps, error: fetchError } = await admin
      .from("email_otps")
      .select("id, email, code_hash, expires_at, used, attempts, metadata, user_id, created_at")
      .eq("email", normalizedEmail)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const pending = otps?.[0];
    if (!pending) {
      return NextResponse.json({ error: "No OTP pending for this email" }, { status: 400 });
    }

    const now = Date.now();
    const expiresAt = new Date(pending.expires_at).getTime();
    if (now > expiresAt) {
      // Optionally mark as used/expired
      await admin.from("email_otps").update({ used: true }).eq("id", pending.id);
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    const isValid = hashCode(String(code).trim()) === pending.code_hash;
    if (!isValid) {
      await admin
        .from("email_otps")
        .update({ attempts: (pending.attempts ?? 0) + 1 })
        .eq("id", pending.id);
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Mark OTP as used and increment attempts
    const { error: updateError } = await admin
      .from("email_otps")
      .update({ used: true, attempts: (pending.attempts ?? 0) + 1 })
      .eq("id", pending.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Mark email confirmed for the newly created user
    const userId = pending.user_id;
    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      } as any);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Immediately upsert a profile row for this user using metadata captured at signup
    if (userId) {
      const meta = (pending.metadata as any) || {};
      const profilePayload = {
        id: userId,
        email: normalizedEmail,
        full_name: meta.full_name ?? null,
        company_name: meta.company_name ?? null,
        phone: meta.phone ?? null,
        address: meta.address ?? null,
        role: meta.role ?? "client",
      };

      const { error: profileError } = await admin
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }

      // Send onboarding email after successful verification and profile upsert
      try {
        if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const clientName = (meta.full_name || "Client") as string;
          
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; line-height: 1.6;">
              
              <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <h1 style="color: #2c3e50; font-size: 24px; margin: 0;">🏢 MG Consulting Firm LLC</h1>
              </div>

              <h2 style="color: #2c3e50; font-size: 20px; margin: 0 0 15px 0;">Welcome ${clientName}!</h2>
              
              <p style="margin: 0 0 15px 0; color: #333;">We are thrilled to welcome you to MG Consulting Firm LLC! We're excited to partner with you and help your organization achieve its goals.</p>
              
              <p style="margin: 0 0 20px 0; color: #333;">To ensure a smooth start, we'd like to invite you to schedule your onboarding session.</p>
              
              <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 10px 0;">👋 Meet Melissa Houser</h3>
                <p style="margin: 0; color: #333;">During your onboarding session, you'll meet with Melissa Houser, our Principal Consultant. Melissa brings extensive experience to guide you through our consulting framework.</p>
              </div>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="https://calendly.com/mgconsultingfirm/15min" style="display: inline-block; background-color: #3498db; color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-weight: bold; font-size: 16px;">📅 Schedule Your Onboarding</a>
              </div>
              
              <h3 style="color: #2c3e50; font-size: 18px; margin: 20px 0 10px 0;">What We'll Cover:</h3>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #333;">
                <li>Our consulting framework and approach</li>
                <li>Your goals and desired outcomes</li>
                <li>Key milestones for our engagement</li>
                <li>Any questions you may have</li>
              </ul>
              
              <p style="margin: 20px 0 0 0; color: #333;">We look forward to connecting with you soon!</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0; color: #666;">Best regards,<br><strong>The MG Consulting Team</strong></p>
              </div>
              
            </div>
          `;
          
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: normalizedEmail,
            subject: "Welcome to MG Consulting Firm – Schedule Your Onboarding",
            html,
          });
        }
      } catch (e) {
        // Do not fail verification if email sending fails
        console.error("Onboarding email send failed:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
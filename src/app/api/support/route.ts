import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

// POST /api/support
// Body: { subject: string, priority?: "Low"|"Medium"|"High", details: string }
// Sends an email to the configured support recipient using Resend.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subject = String(body?.subject || "").trim();
    const priority = (String(body?.priority || "Low").trim() || "Low") as "Low" | "Medium" | "High";
    const details = String(body?.details || "").trim();

    if (!subject || !details) {
      return NextResponse.json({ error: "Missing subject or details" }, { status: 400 });
    }

    // Optional: include current user context in the support email
    let userEmail: string | undefined;
    let userId: string | undefined;
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userEmail = user?.email ?? undefined;
      userId = user?.id ?? undefined;
    } catch (_) {
      // Ignore user fetch errors for support submission
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const supportTo = process.env.SUPPORT_TO_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || fromEmail;

    if (!apiKey || !fromEmail) {
      return NextResponse.json({ error: "Resend not configured" }, { status: 501 });
    }

    if (!supportTo) {
      return NextResponse.json({ error: "Support recipient not configured" }, { status: 501 });
    }

    const resend = new Resend(apiKey);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="margin:0 0 12px 0;">New Support Request</h2>
        <p style="margin:0 0 8px 0;"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p style="margin:0 0 8px 0;"><strong>Priority:</strong> ${escapeHtml(priority)}</p>
        ${userEmail ? `<p style="margin:0 0 8px 0;"><strong>From user:</strong> ${escapeHtml(userEmail)}</p>` : ""}
        <div style="margin-top: 16px; padding: 12px; background:#f8f9fa; border-radius: 8px;">
          <div style="white-space: pre-wrap;">${escapeHtml(details)}</div>
        </div>
      </div>
    `;

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: supportTo,
      subject: `[Support] ${subject} (${priority})`,
      html,
    });

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    // Persist support ticket for the user (server-side, bypass RLS via service role)
    try {
      if (userId) {
        const admin = createAdminSupabaseClient();
        const { error: insErr } = await admin.from("support_tickets").insert({
          user_id: userId,
          subject,
          description: `Priority: ${priority}\n\n${details}`,
          status: "open",
        });
        if (insErr) {
          // Non-fatal; log server-side only
          console.error("[support] insert support_tickets error:", insErr.message);
        }
      }
    } catch (e) {
      console.error("[support] failed to persist ticket:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
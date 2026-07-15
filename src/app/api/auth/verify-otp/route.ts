import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { hashCode } from "@/lib/otp-store";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";
import {
  createWorkDriveFolder,
  getBiginContactIdByEmail,
  updateBiginContactWorkdriveId,
} from "@/lib/zoho-workdrive";

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

      // Automatically provision a WorkDrive folder for this client and link it in Bigin
      try {
        const companyName = (meta.company_name as string | null) || (meta.full_name as string | null) || normalizedEmail;
        const parentFolderId = process.env.NEXT_PUBLIC_WORKDRIVE_CLIENT_DOCUMENTS_FOLDER_ID;

        if (parentFolderId && companyName) {
          // 1. Create a parent folder named after the company inside the root client documents folder
          const newFolder = await createWorkDriveFolder(parentFolderId, companyName);
          const newFolderId: string = newFolder?.id;

          if (newFolderId) {
            // 2. Find the matching Bigin contact and write the folder ID to their record
            const contactId = await getBiginContactIdByEmail(normalizedEmail);
            if (contactId) {
              await updateBiginContactWorkdriveId(contactId, newFolderId);
            } else {
              console.warn(`[verify-otp] No Bigin contact found for ${normalizedEmail}; folder created but Bigin not updated.`);
            }

            console.log(`[verify-otp] WorkDrive folder "${companyName}" (${newFolderId}) created for ${normalizedEmail}`);
          }
        } else {
          console.warn("[verify-otp] Skipping WorkDrive folder creation: missing parentFolderId or companyName.");
        }
      } catch (wdErr) {
        // Non-fatal: log the error but do not block the user from completing signup
        console.error("[verify-otp] WorkDrive folder creation failed:", wdErr);
      }

      // Send onboarding email after successful verification and profile upsert
      try {
        if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const clientName = (meta.full_name || "Client") as string;
          const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));
          const portalUrl = `${(process.env.NEXT_PUBLIC_SITE_URL || "https://mgconsultingfirm.com").replace(/\/$/, "")}/login`;
          
          const html = `
            <div style="margin:0;background:#f6f9fb;padding:32px 16px;font-family:Arial,sans-serif;color:#1a3340;">
              <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8eef1;border-radius:14px;overflow:hidden;">
                <div style="background:#264f5e;padding:24px;text-align:center;">
                  <img src="cid:mg-logo" alt="MG Consulting Firm" style="width:72px;height:72px;object-fit:contain;background:#fff;border-radius:12px;padding:6px;">
                  <h1 style="color:#fff;font-size:22px;margin:14px 0 0;">MG Consulting Firm</h1>
                </div>
                <div style="padding:32px;">
                  <h2 style="color:#1a3340;font-size:22px;margin:0 0 16px;">Welcome to your Client Portal</h2>
                  <p style="color:#4a6672;line-height:1.6;margin:0 0 16px;">Hi ${clientName},</p>
                  <p style="color:#4a6672;line-height:1.6;margin:0 0 20px;">Your account has been successfully created. The MG Consulting Client Portal gives you one convenient place to manage your engagement with our team.</p>
                  <div style="background:#f0f7f9;border-left:4px solid #264f5e;border-radius:8px;padding:16px 18px;margin:20px 0;">
                    <p style="color:#1a3340;font-weight:bold;margin:0 0 10px;">Inside the portal, you can:</p>
                    <ul style="color:#4a6672;line-height:1.8;margin:0;padding-left:20px;">
                      <li>Access and upload documents</li>
                      <li>Review and sign contracts</li>
                      <li>Browse resources, guides, and templates</li>
                      <li>Book appointments with our consultants</li>
                      <li>View invoices and payment history</li>
                      <li>Update your company details and contact information</li>
                      <li>Submit questions and support requests</li>
                    </ul>
                  </div>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="${portalUrl}" style="display:inline-block;background:#264f5e;color:#fff;text-decoration:none;padding:14px 24px;border-radius:9px;font-weight:bold;">Sign in to the Client Portal</a>
                  </div>
                  <p style="color:#4a6672;line-height:1.6;margin:0 0 20px;">We look forward to working with you.</p>
                  <p style="color:#4a6672;line-height:1.6;margin:0;">Best regards,<br><strong style="color:#1a3340;">MG Consulting Firm Team</strong></p>
                </div>
              </div>
            </div>
          `;
          
          await resend.emails.send({
            from: `MG Consulting Firm <${process.env.RESEND_FROM_EMAIL}>`,
            to: normalizedEmail,
            subject: "Welcome to the MG Consulting Client Portal",
            html,
            attachments: [{
              filename: "logo.png",
              content: logo.toString("base64"),
              contentId: "mg-logo",
            }],
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

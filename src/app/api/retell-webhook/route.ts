import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

let accessToken: string | null = null;

// --- CONFIG ---
const RETELL_CALL_FIELD_API_NAME = process.env.RETELL_CALL_FIELD_API_NAME || "Retell_Call_ID";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "aksuba7@gmail.com";
const ZOHO_CAMPAIGNS_AUTH_TOKEN = process.env.ZOHO_CAMPAIGNS_AUTH_TOKEN!;
const ZOHO_CAMPAIGNS_LIST_KEY = process.env.ZOHO_CAMPAIGNS_LIST_KEY!;
const SMTP_EMAIL = process.env.SMTP_EMAIL!;
const SMTP_PASS = process.env.SMTP_PASSWORD!;
const SMTP_HOST = process.env.SMTP_HOST!;

// --- Transporter (Email Sender) ---
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_PASS,
  },
});

// --- Helper: Refresh Zoho Token ---
async function refreshZohoToken(): Promise<string> {
  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (data.access_token) {
    accessToken = data.access_token;
    console.log("✅ Zoho token refreshed");
    return data.access_token;
  } else {
    console.error("❌ Failed to refresh Zoho token:", data);
    throw new Error("Failed to refresh Zoho token");
  }
}

// --- Safe JSON Helper ---
async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

// --- Check if Lead Already Exists ---
async function leadExistsByCallId(callId: string, token: string) {
  if (!callId) return false;
  const criteria = `(${RETELL_CALL_FIELD_API_NAME}:equals:${callId})`;
  const url = `https://www.zohoapis.com/crm/v2/Leads/search?criteria=${encodeURIComponent(criteria)}`;
  const resp = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const data = await safeJson(resp);
  return Array.isArray(data.data) && data.data.length > 0;
}

// --- Create New Lead in Zoho CRM ---
async function createLead(payload: any, token: string) {
  const leadObj: any = {
    Last_Name: payload.lastName || "Unknown",
    Company: payload.company || payload.lastName || "Retell Lead",
    Description: payload.description || "",
    Lead_Source: "AI",
  };

  if (payload.email) leadObj.Email = payload.email;
  if (payload.country) leadObj.Country = payload.country;
  if (payload.callId) leadObj[RETELL_CALL_FIELD_API_NAME] = payload.callId;

  const res = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [leadObj] }),
  });

  return await safeJson(res);
}

// --- Extract Details from Transcript ---
type TranscriptEntry = { role?: string; content?: string };

function extractFinalDetails(transcriptArray: TranscriptEntry[]) {
  const result: any = { name: null, email: null, company: null, location: null, industry: null };
  if (!Array.isArray(transcriptArray) || transcriptArray.length === 0) return result;

  for (let i = transcriptArray.length - 1; i >= 0; i--) {
    const text = transcriptArray[i].content || "";
    if (!result.name) {
      const nm = text.match(/(?:name[:\s]*is|my name is|this is)\s*([a-zA-Z\s]+)/i);
      if (nm) result.name = nm[1].trim();
    }
    if (!result.email) {
      const em = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (em) result.email = em[1].trim().toLowerCase();
    }
    if (!result.company) {
      const cm = text.match(/(?:company|organization|business)[:\s]*(?:is|called)?\s*([a-zA-Z0-9 &]+)/i);
      if (cm) result.company = cm[1].trim();
    }
    if (!result.location) {
      const lc = text.match(/(?:location|based in|city)[:\s]*(?:is|at)?\s*([a-zA-Z0-9, ]+)/i);
      if (lc) result.location = lc[1].trim();
    }
    if (!result.industry) {
      const ind = text.match(/(?:industry|sector)[:\s]*(?:is|in)?\s*([a-zA-Z0-9 &]+)/i);
      if (ind) result.industry = ind[1].trim();
    }
  }

  // Default fallback
  if (!result.company && result.name) result.company = result.name;

  return result;
}

// --- Email Templates ---
function clientEmailTemplate(name: string) {
  return `
    <h3>Thank You for Connecting with MG Consulting Firm</h3>
    <p>Hi ${name || "there"},</p>
    <p>Thank you for speaking with our virtual assistant. We’ve received your details and our consultant will contact you soon to schedule your meeting.</p>
    <p>Best regards,<br/>Team MG Consulting Firm</p>
  `;
}

function adminEmailTemplate(lead: any) {
  return `
    <h3>New Lead Created from Retell AI Conversation</h3>
    <p>A new lead was created:</p>
    <ul>
      <li><strong>Name:</strong> ${lead.name || "N/A"}</li>
      <li><strong>Email:</strong> ${lead.email || "N/A"}</li>
      <li><strong>Company:</strong> ${lead.company || "N/A"}</li>
      <li><strong>Location:</strong> ${lead.location || "N/A"}</li>
      <li><strong>Industry:</strong> ${lead.industry || "N/A"}</li>
    </ul>
  `;
}

// --- Send Emails (Client + Admin) ---
async function sendEmails(lead: any) {
  try {
    if (lead.email) {
      await transporter.sendMail({
        from: SMTP_EMAIL,
        to: lead.email,
        subject: "Thank You for Connecting with MG Consulting Firm",
        html: clientEmailTemplate(lead.name),
      });
      console.log("📨 Client email sent");
    }

    await transporter.sendMail({
      from: SMTP_EMAIL,
      to: ADMIN_EMAIL,
      subject: "New Lead Created via Retell AI",
      html: adminEmailTemplate(lead),
    });
    console.log("📨 Admin email sent");
  } catch (err) {
    console.error("❌ Email sending failed:", err);
  }
}

// --- MAIN HANDLER ---
export async function POST(req: NextRequest) {
  try {
    console.log("🟢 Retell webhook triggered");
    const body = await req.json().catch(() => ({}));
    const event = body.event || body.status || null;

    if (!["call_completed", "call_analyzed"].includes(event)) {
      return NextResponse.json({ success: true, message: `Event "${event}" ignored` });
    }

    const callId = body.call_id || body.call?.call_id || body.call?.id;
    const transcriptArray: TranscriptEntry[] =
      body.call?.transcript_object ||
      body.call?.conversation ||
      body.call?.call_analysis?.conversation ||
      body.call?.call_analysis?.messages ||
      [];

    const finalDetails = extractFinalDetails(transcriptArray);
    const transcript = transcriptArray.map(t => t.content || "").join("\n");

    let token = accessToken || (await refreshZohoToken());

    if (callId && (await leadExistsByCallId(callId, token))) {
      console.log("⚠️ Lead already exists — skipping duplicate");
      return NextResponse.json({ success: true, message: "Lead already exists" });
    }

    const description = `Industry: ${finalDetails.industry || ""}\nLocation: ${finalDetails.location || ""}\n\nTranscript:\n${transcript}`;

    const leadResp = await createLead(
      {
        lastName: finalDetails.name || "Unknown",
        company: finalDetails.company,
        email: finalDetails.email,
        description,
        country: finalDetails.location,
        callId,
      },
      token
    );

    console.log("✅ Lead created:", leadResp);

    // Trigger both emails
    await sendEmails(finalDetails);

    console.log("🎉 Lead + Email process completed successfully!");
    return NextResponse.json({ success: true, message: "Lead created & emails sent" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

let accessToken: string | null = null;

// --- CONFIG ---
const RETELL_CALL_FIELD_API_NAME = process.env.RETELL_CALL_FIELD_API_NAME || "Retell_Call_ID";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "aksuba7@gmail.com";
sgMail.setApiKey(process.env.SENDGRID_API_KEY!); // SendGrid API Key

// --- Helpers ---
async function refreshZohoToken() {
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

  const text = await res.text();
  try {
    const data = text ? JSON.parse(text) : {};
    if (data.access_token) accessToken = data.access_token;
    else console.error("Failed to refresh token", data);
  } catch (err) {
    console.error("Failed to parse token response:", text);
  }
  return accessToken;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.warn("safeJson: invalid JSON response:", text);
    return { raw: text };
  }
}

// --- SendGrid Email Function ---
async function sendEmail(to: string, subject: string, html: string) {
  if (!to) return { error: "Missing recipient email" };
  try {
    const msg = {
      to,
      from: "mgcentral@mgconsultingfirm.com", // Verified sender in SendGrid
      subject,
      html,
    };
    const res = await sgMail.send(msg);
    console.log("✅ Email sent via SendGrid:", res);
    return { success: true, res };
  } catch (err: any) {
    console.error("❌ SendGrid email error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

// --- Zoho CRM helpers ---
async function leadExistsByCallId(callId: string, token: string) {
  if (!callId) return false;
  const criteria = `(${RETELL_CALL_FIELD_API_NAME}:equals:${callId})`;
  const url = `https://www.zohoapis.com/crm/v2/Leads/search?criteria=${encodeURIComponent(criteria)}`;
  const resp = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const data = await safeJson(resp);
  return Array.isArray(data.data) && data.data.length > 0;
}

async function createLead(payload: {
  lastName: string;
  company: string | null;
  email: string | null;
  description: string;
  country?: string;
  callId?: string;
}, token: string) {
  const leadObj: any = {
    Last_Name: payload.lastName || "Unknown",
    Company: payload.company || "Retell Lead",
    Description: payload.description || "",
    Lead_Source: "AI",
  };
  if (payload.email) leadObj.Email = payload.email;
  if (payload.country) leadObj.Country = payload.country;
  if (payload.callId) leadObj[RETELL_CALL_FIELD_API_NAME] = payload.callId;

  const res = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: [leadObj] }),
  });

  return safeJson(res);
}

// --- Extract final user data ---
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
    if (result.name && result.email && result.company && result.location && result.industry) break;
  }
  return result;
}

// --- Main webhook handler ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("🟢 Incoming Retell payload:", JSON.stringify(body));

    if (!body || Object.keys(body).length === 0)
      return NextResponse.json({ success: true, message: "Empty payload ignored" });

    const event = body.event || body.status || null;
    console.log("🟢 Event type:", event);

    // Only proceed for completed/analyzed calls
    if (!["call_completed", "call_analyzed"].includes(event)) {
      console.log(`🟡 Event "${event}" ignored.`);
      return NextResponse.json({ success: true, message: `Event "${event}" ignored` });
    }

    const callId = body.call_id || body.call?.call_id || body.call?.id;
    console.log("🟢 Call ID:", callId);

    const transcriptArray: TranscriptEntry[] =
      body.call?.transcript_object ||
      body.call?.conversation ||
      body.call?.call_analysis?.conversation ||
      body.call?.call_analysis?.messages ||
      [];

    const finalDetails = extractFinalDetails(transcriptArray);
    const transcript =
      (typeof body.transcript === "string" && body.transcript) ||
      body.call?.transcript ||
      transcriptArray.map(t => t.content || "").join("\n");

    const userName = finalDetails.name || "Unknown";
    const userEmail = finalDetails.email || null;
    const company = finalDetails.company || null;
    const location = finalDetails.location || null;
    const industry = finalDetails.industry || null;

    console.log("🟢 Extracted user details:", { userName, userEmail, company, location, industry });
    await sendEmail("aksuba7@gmail.com", "Test Email", "<p>Hello from SendGrid</p>");


    // Refresh Zoho token
    const token = accessToken || (await refreshZohoToken());
    if (!token) {
      console.error("❌ No Zoho token available");
      return NextResponse.json({ error: "No Zoho token" }, { status: 500 });
    }

    // Skip if lead already exists
    if (callId && (await leadExistsByCallId(callId, token))) {
      console.log("🟡 Lead already exists for this call ID");
      return NextResponse.json({ success: true, message: "Already processed (call id)" });
    }

    // Create Zoho lead
    try {
      const description = `Industry: ${industry || ""}\nLocation: ${location || ""}\n\nTranscript:\n${transcript}`;
      const leadResp = await createLead(
        { lastName: userName, company, email: userEmail, description, country: location, callId },
        token
      );
      console.log("🟢 Zoho lead created:", leadResp);
    } catch (err) {
      console.error("❌ Failed to create Zoho lead:", err);
      return NextResponse.json({ error: "Zoho lead creation failed", details: err }, { status: 500 });
    }

    // Send emails AFTER successful lead creation
    const summaryHtml = `
      <h3>Retell Call Summary</h3>
      <p><b>Call ID:</b> ${callId || "N/A"}</p>
      <p><b>Name:</b> ${userName}</p>
      <p><b>Email:</b> ${userEmail}</p>
      <p><b>Company:</b> ${company}</p>
      <p><b>Location:</b> ${location}</p>
      <p><b>Industry:</b> ${industry}</p>
      <hr/>
      <pre>${transcript}</pre>
    `;

    try {
      await sendEmail(ADMIN_EMAIL, `Retell Call ${callId || ""} Summary`, summaryHtml);
      console.log("✅ Admin email sent");
    } catch (err) {
      console.error("❌ Admin email failed:", err);
    }

    if (userEmail) {
      try {
        await sendEmail(
          userEmail,
          "Thanks — we received your intake",
          `<p>Hi ${userName},</p><p>Thank you for sharing your details. Our team will get back to you shortly.</p>`
        );
        console.log("✅ User email sent");
      } catch (err) {
        console.error("❌ User email failed:", err);
      }
    } else {
      console.warn("⚠️ No user email found - skipping user email");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return NextResponse.json({ error: "Internal error", details: err }, { status: 500 });
  }
}


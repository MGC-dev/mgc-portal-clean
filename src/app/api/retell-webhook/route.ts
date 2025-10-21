import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

// --- CONFIG ---
const RETELL_CALL_FIELD_API_NAME = process.env.RETELL_CALL_FIELD_API_NAME || "Retell_Call_ID";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "aksuba7@gmail.com";
const ZOHO_CAMPAIGNS_AUTH_TOKEN = process.env.ZOHO_CAMPAIGNS_AUTH_TOKEN!;
const ZOHO_CAMPAIGNS_LIST_KEY = process.env.ZOHO_CAMPAIGNS_LIST_KEY!;

// --- Helper: Refresh Zoho CRM Token ---
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
  const token: string = data.access_token; // local variable ensures type string
  console.log("✅ Zoho token refreshed:", token.slice(0, 5) + "...");
  return token;
  }else {
    console.error("❌ Failed to refresh Zoho token:", data);
    throw new Error("Failed to refresh Zoho token");
  }
}

// --- Safe JSON helper ---
async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

// --- Zoho Campaigns: Add contact & send email ---
async function addToZohoCampaignsAndSendEmail(email: string, name: string) {
  if (!email) return { error: "Missing email for Zoho Campaigns" };

  console.log("📨 Adding contact to Zoho Campaigns & triggering email...");

  try {
    const response = await fetch("https://campaigns.zoho.com/api/v1.1/json/listsubscribers/add", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        resfmt: "JSON",
        listkey: ZOHO_CAMPAIGNS_LIST_KEY,
        contactinfo: JSON.stringify({
          "Contact Email": email,
          "First Name": name,
        }),
        authtoken: ZOHO_CAMPAIGNS_AUTH_TOKEN,
      }),
    });

    const data = await response.json();
    console.log("✅ Zoho Campaigns response:", data);
    return data;
  } catch (err: any) {
    console.error("❌ Zoho Campaigns error:", err);
    return { error: err.message || String(err) };
  }
}

// --- Check if lead already exists in Zoho CRM ---
async function leadExistsByCallId(callId: string, token: string) {
  if (!callId) return false;
  const criteria = `(${RETELL_CALL_FIELD_API_NAME}:equals:${callId})`;
  const url = `https://www.zohoapis.com/crm/v2/Leads/search?criteria=${encodeURIComponent(criteria)}`;
  const resp = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const data = await safeJson(resp);
  return Array.isArray(data.data) && data.data.length > 0;
}

// --- Create new lead in Zoho CRM ---
async function createLead(
  payload: { lastName: string; company?: string | null; email?: string | null; description: string; country?: string; callId?: string },
  token: string
) {
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

  return await safeJson(res);
}

// --- Extract user data from transcript ---
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
    console.log("🟢 Retell webhook triggered");
    const body = await req.json().catch(() => ({}));
    const event = body.event || body.status || null;

    if (!["call_completed", "call_analyzed"].includes(event)) {
      console.log(`ℹ️ Ignored event: ${event}`);
      return NextResponse.json({ success: true, message: `Event "${event}" ignored` });
    }

    const callId = body.call_id || body.call?.call_id || body.call?.id;
    const transcriptArray: TranscriptEntry[] =
      body.call?.transcript_object || body.call?.conversation || body.call?.call_analysis?.conversation || body.call?.call_analysis?.messages || [];

    const finalDetails = extractFinalDetails(transcriptArray);
    const transcript = (typeof body.transcript === "string" && body.transcript) || transcriptArray.map(t => t.content || "").join("\n");

    // --- Refresh token ---
    let token: string;
    try {
      token = accessToken || (await refreshZohoToken());
    } catch (err) {
      console.error("❌ Zoho token error:", err);
      return NextResponse.json({ error: "No Zoho token" }, { status: 500 });
    }

    // --- Ensure lead created only once ---
    if (callId && (await leadExistsByCallId(callId, token))) {
      console.log("⚠️ Lead already exists for this conversation, skipping creation");
      return NextResponse.json({ success: true, message: "Lead already exists" });
    }

    const description = `Industry: ${finalDetails.industry || ""}\nLocation: ${finalDetails.location || ""}\n\nTranscript:\n${transcript}`;

    // --- Create lead ---
    const leadResp = await createLead(
      { lastName: finalDetails.name || "Unknown", company: finalDetails.company, email: finalDetails.email, description, country: finalDetails.location, callId },
      token
    );
    console.log("✅ Lead created:", leadResp);

    // --- Trigger Zoho Campaign email ---
    if (finalDetails.email) {
      await addToZohoCampaignsAndSendEmail(finalDetails.email, finalDetails.name || "User");
    }

    console.log("🎉 Lead creation + email process completed successfully!");
    return NextResponse.json({ success: true, message: "Lead created and email sent" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

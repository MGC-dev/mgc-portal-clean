import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

// --- CONFIG ---
const RETELL_CALL_FIELD_API_NAME = process.env.RETELL_CALL_FIELD_API_NAME || "Retell_Call_ID";
const ZOHO_CAMPAIGNS_AUTH_TOKEN = process.env.ZOHO_CAMPAIGNS_AUTH_TOKEN!;
const ZOHO_CAMPAIGNS_LIST_KEY = process.env.ZOHO_CAMPAIGNS_LIST_KEY!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "aksuba7@gmail.com";

// --- Helper: Refresh Zoho CRM token ---
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
    if (data.access_token) {
      accessToken = data.access_token;
      console.log("✅ Zoho token refreshed");
    } else {
      console.error("❌ Failed to refresh token", data);
    }
  } catch (err) {
    console.error("❌ Failed to parse token response:", text);
  }
  return accessToken;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

// --- Zoho Campaigns: Add Contact ---
async function addToZohoCampaignsList(email: string, name: string) {
  if (!email) return { error: "Missing email for Zoho Campaigns" };

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
    console.log("✅ Added to Zoho Campaigns:", data);
    return data;
  } catch (err: any) {
    console.error("❌ Failed to add to Zoho Campaigns:", err);
    return { error: err.message || String(err) };
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
  }
  return result;
}

// --- Main webhook handler ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("🟢 Incoming Retell payload:", JSON.stringify(body));

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
    const transcript =
      (typeof body.transcript === "string" && body.transcript) ||
      body.call?.transcript ||
      transcriptArray.map(t => t.content || "").join("\n");

    const userName = finalDetails.name || "Unknown";
    const userEmail = finalDetails.email || null;
    const company = finalDetails.company || null;
    const location = finalDetails.location || null;
    const industry = finalDetails.industry || null;

    const token = accessToken || (await refreshZohoToken());
    if (!token) return NextResponse.json({ error: "No Zoho token" }, { status: 500 });

    if (callId && (await leadExistsByCallId(callId, token))) {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    const description = `Industry: ${industry || ""}\nLocation: ${location || ""}\n\nTranscript:\n${transcript}`;
    const leadResp = await createLead(
      { lastName: userName, company, email: userEmail, description, country: location, callId },
      token
    );
    console.log("🟢 Zoho lead created:", leadResp);

    // ✅ Add to Zoho Campaigns
    if (userEmail) {
      await addToZohoCampaignsList(userEmail, userName);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

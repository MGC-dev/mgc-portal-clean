import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;
const processedCallIds = new Set<string>(); // in-memory cache

// --- CONFIG ---
const RETELL_CALL_FIELD_API_NAME =
  process.env.RETELL_CALL_FIELD_API_NAME || "Retell_Call_ID";

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
      const nm = text.match(/(?:name is|name as|my name is|this is)\s*([a-zA-Z\s]+)/i);
      if (nm) result.name = nm[1].trim();
    }
    if (!result.email) {
      const em = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (em) result.email = em[1].trim().toLowerCase();
    }
    if (!result.company) {
      const cm = text.match(/(?:company|comapny as|organization|business)[:\s]*(?:is|called)?\s*([a-zA-Z0-9 &]+)/i);
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

  if (!result.company && result.name) result.company = result.name;

  return result;
}

// --- MAIN HANDLER ---
export async function POST(req: NextRequest) {
  try {
    console.log("🟢 Retell webhook triggered");
    const body = await req.json().catch(() => ({}));
    const event = body.event || body.status || null;

    // ✅ Only trigger on completed call
    if (event !== "call_completed") {
      console.log(`ℹ️ Ignored event: ${event}`);
      return NextResponse.json({ success: true, message: `Event "${event}" ignored` });
    }

    const callId = body.call_id || body.call?.call_id || body.call?.id;
    if (!callId) {
      console.log("⚠️ Missing callId, skipping");
      return NextResponse.json({ success: false, message: "Missing callId" });
    }

    // ✅ Prevent duplicate calls in same runtime
    if (processedCallIds.has(callId)) {
      console.log("⚠️ Duplicate webhook call ignored (same runtime)");
      return NextResponse.json({ success: true, message: "Duplicate ignored" });
    }
    processedCallIds.add(callId);

    const transcriptArray: TranscriptEntry[] =
      body.call?.transcript_object ||
      body.call?.conversation ||
      body.call?.call_analysis?.conversation ||
      body.call?.call_analysis?.messages ||
      [];

    const finalDetails = extractFinalDetails(transcriptArray);
    const transcript = transcriptArray.map(t => t.content || "").join("\n");

    // Refresh Token
    const token = accessToken || (await refreshZohoToken());

    // Ensure lead not already exists in Zoho
    if (await leadExistsByCallId(callId, token)) {
      console.log("⚠️ Lead already exists — skipping duplicate creation");
      return NextResponse.json({ success: true, message: "Lead already exists" });
    }

    // Build Description
    const description = `Industry: ${finalDetails.industry || ""}\nLocation: ${finalDetails.location || ""}\n\nTranscript:\n${transcript}`;

    // Create Lead in Zoho CRM
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

    console.log("✅ Lead created successfully:", leadResp);

    console.log("🎉 Lead creation complete. Zoho CRM workflow will handle emails.");

    return NextResponse.json({ success: true, message: "Lead created successfully" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

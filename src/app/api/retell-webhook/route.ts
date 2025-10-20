// /app/api/retell-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

// CONFIG (set these in your environment)
const RETELL_CALL_FIELD_API_NAME = process.env.RETELL_CALL_FIELD_API_NAME || "Retell_Call_ID";
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID!;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET!;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN!;
const ZOHO_CAMPAIGNS_AUTH_TOKEN = process.env.ZOHO_CAMPAIGNS_AUTH_TOKEN!;
const ZOHO_CAMPAIGNS_LIST_KEY = process.env.ZOHO_CAMPAIGNS_LIST_KEY!;

// small helper to parse JSON responses safely
async function safeJson(res: Response) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
}

// ------------- Logging helper -------------
function log(step: string, ...args: any[]) {
  // prints consistent, timestamped messages to server console
  const time = new Date().toISOString();
  console.log(`[RetellWebhook] [${time}] ${step}`, ...args);
}

// ------------- Refresh Zoho CRM token (uses refresh_token flow) -------------
async function refreshZohoToken() {
  log("Refreshing Zoho CRM access token...");
  try {
    const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        refresh_token: ZOHO_REFRESH_TOKEN,
      }),
    });

    const data = await safeJson(res);
    log("Zoho token response status:", res.status);
    log("Zoho token response body:", data);

    if (data.access_token) {
      accessToken = data.access_token;
      log("Access token refreshed successfully (token length):", data.access_token.length);
      return accessToken;
    } else {
      log("Failed to get access token from Zoho:", data);
      return null;
    }
  } catch (err) {
    log("Error refreshing token:", err);
    return null;
  }
}

// ------------- CRM helpers -------------
async function leadExistsByCallId(callId: string, token: string) {
  if (!callId) return false;
  log("Checking if lead exists for callId:", callId);
  const criteria = `(${RETELL_CALL_FIELD_API_NAME}:equals:${callId})`;
  const url = `https://www.zohoapis.com/crm/v2/Leads/search?criteria=${encodeURIComponent(criteria)}`;
  const resp = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const data = await safeJson(resp);
  log("LeadExists response status:", resp.status, "body:", data);
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
  log("Creating lead in Zoho CRM for:", payload.lastName, payload.email);
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

  const data = await safeJson(res);
  log("createLead response status:", res.status, "body:", data);
  return { status: res.status, body: data };
}

// ------------- Zoho Campaigns helper (adds single contact) -------------
async function addToZohoCampaignsList(email: string, name: string) {
  log("Adding contact to Zoho Campaigns list:", ZOHO_CAMPAIGNS_LIST_KEY, email, name);
  try {
    const res = await fetch("https://campaigns.zoho.com/api/v1.1/json/listsubscribers/add", {
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

    const data = await safeJson(res);
    log("Zoho Campaigns add response status:", res.status, "body:", data);
    return { status: res.status, body: data };
  } catch (err) {
    log("Zoho Campaigns add error:", err);
    return { error: String(err) };
  }
}

// ------------- Transcript parsing helper -------------
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
  log("Extracted details:", result);
  return result;
}

// ------------- Main webhook -------------
export async function POST(req: NextRequest) {
  const stepResults: any[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    log("Incoming payload (raw):", body);
    stepResults.push({ step: "payload_received", ok: true });

    // event filter
    const event = (body.event || body.status || null) as string | null;
    log("Event detected:", event);
    if (!["call_completed", "call_analyzed"].includes(event || "")) {
      log(`Event "${event}" ignored — exiting.`);
      return NextResponse.json({ success: true, message: `Event "${event}" ignored` });
    }
    stepResults.push({ step: "event_ok", event });

    // extract
    const callId = body.call_id || body.call?.call_id || body.call?.id || null;
    log("Call ID:", callId);
    stepResults.push({ step: "call_id", callId });

    const transcriptArray: TranscriptEntry[] =
      body.call?.transcript_object ||
      body.call?.conversation ||
      body.call?.call_analysis?.conversation ||
      body.call?.call_analysis?.messages ||
      [];
    log("Transcript entries count:", transcriptArray.length);

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

    log("Final details:", { userName, userEmail, company, location, industry });
    stepResults.push({ step: "extracted_details", details: { userName, userEmail, company, location, industry } });

    // refresh token (Zoho CRM)
    const token = accessToken || (await refreshZohoToken());
    if (!token) {
      stepResults.push({ step: "refresh_token_failed" });
      log("No Zoho token available — aborting.");
      return NextResponse.json({ success: false, steps: stepResults, error: "No Zoho token" }, { status: 500 });
    }
    stepResults.push({ step: "refresh_token_ok" });

    // lead exists?
    if (callId && (await leadExistsByCallId(callId, token))) {
      log("Lead already exists for callId — skipping creation and campaigns add.");
      stepResults.push({ step: "lead_exists", callId });
      return NextResponse.json({ success: true, message: "Already processed (call id)", steps: stepResults });
    }
    stepResults.push({ step: "lead_does_not_exist", callId });

    // create lead
    const description = `Industry: ${industry || ""}\nLocation: ${location || ""}\n\nTranscript:\n${transcript}`;
    const createResp = await createLead({ lastName: userName, company, email: userEmail, description, country: location, callId }, token);
    stepResults.push({ step: "create_lead_response", createResp });

    // check create response for success
    const createStatusOk = createResp && createResp.body && Array.isArray(createResp.body.data) && createResp.body.data[0]?.status === "success";
    if (!createStatusOk) {
      log("Lead creation did not succeed:", createResp);
      return NextResponse.json({ success: false, steps: stepResults, error: "Lead creation failed", createResp }, { status: 500 });
    }
    log("Lead created successfully.");
    stepResults.push({ step: "lead_created", leadResp: createResp.body });

    // Add to Zoho Campaigns (this triggers autoresponder if configured)
    if (userEmail) {
      const campaignsResp = await addToZohoCampaignsList(userEmail, userName);
      stepResults.push({ step: "campaigns_add_response", campaignsResp });

      // campaigns API returns structure - check basic success heuristics
      if (campaignsResp && (campaignsResp.body?.status === "success" || campaignsResp.body?.code === 200 || campaignsResp.body?.message?.toLowerCase?.().includes("success"))) {
        log("Campaigns add reported success:", campaignsResp.body);
        stepResults.push({ step: "campaigns_add_ok" });
      } else {
        log("Campaigns add may have failed — inspect response", campaignsResp);
        stepResults.push({ step: "campaigns_add_maybe_failed", campaignsResp });
      }
    } else {
      log("No user email to add to Campaigns - skipped.");
      stepResults.push({ step: "campaigns_skipped_no_email" });
    }

    log("All steps complete. Returning success.");
    return NextResponse.json({ success: true, steps: stepResults });
  } catch (err) {
    log("Unhandled error in webhook:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

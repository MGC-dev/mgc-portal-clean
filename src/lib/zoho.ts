import { NextResponse } from "next/server";

type ZohoAuthConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  region?: string; // e.g., 'com', 'eu', 'in'
};

const ZOHO_REGION = process.env.ZOHO_REGION || "com";
const ZOHO_AUTH_BASE = `https://accounts.zoho.${ZOHO_REGION}`;
const ZOHO_SIGN_BASE = `https://sign.zoho.${ZOHO_REGION}/api/v1`;

// Simple in-memory cache for Zoho access tokens to avoid hitting rate limits
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

// Normalize a host/origin string to a bare origin without path/query, removing trailing slashes
function normalizeOrigin(input?: string): string | undefined {
  if (!input) return undefined;
  try {
    const url = new URL(input);
    return url.origin;
  } catch {
    // Fallback: trim whitespace and trailing slashes; must be a simple origin
    return input.trim().replace(/\/+$/, "");
  }
}

export async function getZohoAccessToken(): Promise<string> {
  const config: ZohoAuthConfig = {
    clientId: process.env.ZOHO_CLIENT_ID || "",
    clientSecret: process.env.ZOHO_CLIENT_SECRET || "",
    refreshToken: process.env.ZOHO_REFRESH_TOKEN || "",
    region: process.env.ZOHO_REGION || "com",
  };

  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    throw new Error("Zoho OAuth configuration missing. Please set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN environment variables.");
  }

  // Return cached token if still valid (buffer 10 seconds for safety)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 10000) {
    return tokenCache.accessToken;
  }

  const url = `${ZOHO_AUTH_BASE}/oauth/v2/token`;
  const params = new URLSearchParams({
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });

  try {
    const res = await fetch(`${url}?${params.toString()}`, { 
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    const responseText = await res.text();
    
    if (!res.ok) {
      // Handle specific error cases
      if (res.status === 429 || responseText.includes('too many requests')) {
        throw new Error(`Zoho API rate limit exceeded. Please wait a moment and try again.`);
      }
      if (res.status === 401 || responseText.includes('invalid_token')) {
        throw new Error(`Zoho authentication failed. Please check your refresh token.`);
      }
      throw new Error(`Zoho token request failed: ${res.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    if (!data.access_token) {
      throw new Error(`Invalid response from Zoho: missing access_token`);
    }

    const accessToken = data.access_token as string;
    const expiresIn = (data.expires_in as number | undefined) ?? 3600; // seconds
    
    // Cache the token with expiration
    tokenCache = { 
      accessToken, 
      expiresAt: Date.now() + (expiresIn * 1000)
    };
    
    return accessToken;
  } catch (error) {
    // Clear cache on error
    tokenCache = null;
    throw error;
  }
}

// (Removed duplicate old createZohoRequest; consolidated below)

export async function getZohoRequest(requestId: string) {
  const accessToken = await getZohoAccessToken();
  const res = await fetch(`${ZOHO_SIGN_BASE}/requests/${requestId}`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Zoho get request failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

export async function getZohoSigningUrl(requestId: string, host?: string) {
  // Try to read the request first
  let req = await getZohoRequest(requestId);
  let action = req?.requests?.actions?.[0] || req?.actions?.[0];
  let directUrl = action?.sign_url as string | undefined;
  if (directUrl) return directUrl;

  // If the request has not been submitted yet, try to submit it
  const status = (req?.requests?.request_status || req?.request_status || "").toLowerCase();
  const isSubmitted = status === "inprogress" || status === "sent" || status === "completed";
  if (!isSubmitted) {
    try {
      await submitZohoRequest(requestId);
      // Re-fetch request to check for generated signing URL
      req = await getZohoRequest(requestId);
      action = req?.requests?.actions?.[0] || req?.actions?.[0];
      directUrl = action?.sign_url as string | undefined;
      if (directUrl) return directUrl;
    } catch {
      // Ignore submit errors here; we'll attempt embed token below if possible
    }
  }

  // Fallback: fetch embed token URL if host provided
  const actionId = action?.action_id || action?.id;
  const normalizedHost = normalizeOrigin(host);
  if (!normalizedHost || !actionId) return undefined;

  const accessToken = await getZohoAccessToken();
  // Prefer POST as in Zoho's sample payload; send host in body
  const embedUrl = `${ZOHO_SIGN_BASE}/requests/${requestId}/actions/${actionId}/embedtoken`;
  
  // Attempt POST with x-www-form-urlencoded body
  const bodyParams = new URLSearchParams({ host: normalizedHost });
  let res = await fetch(embedUrl, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams,
  });
  let text = await res.text();
  if (!res.ok) {
    console.warn("[zoho] embedtoken POST failed", {
      status: res.status,
      host: normalizedHost,
      requestId,
      actionId,
      body: text,
    });
    // Fallback to GET with host query param (some docs show this form)
    res = await fetch(`${embedUrl}?host=${encodeURIComponent(normalizedHost)}`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    text = await res.text();
    if (!res.ok) {
      console.warn("[zoho] embedtoken GET fallback failed", {
        status: res.status,
        host: normalizedHost,
        requestId,
        actionId,
        body: text,
      });
      return undefined;
    }
  }
  try {
    const payload = JSON.parse(text);
    return (
      payload?.sign_url ||
      payload?.requests?.actions?.[0]?.sign_url ||
      payload?.actions?.[0]?.sign_url ||
      undefined
    );
  } catch {
    return undefined;
  }
}

export async function getZohoDocuments(requestId: string) {
  const accessToken = await getZohoAccessToken();
  const res = await fetch(`${ZOHO_SIGN_BASE}/requests/${requestId}/documents`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Zoho documents failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

export async function downloadZohoDocument(requestId: string, documentId: string) {
  const accessToken = await getZohoAccessToken();
  const res = await fetch(
    `${ZOHO_SIGN_BASE}/requests/${requestId}/documents/${documentId}/download`,
    {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho document download failed: ${res.status} ${text}`);
  }
  const blob = await res.blob();
  return blob;
}

// Submit the Zoho Sign request so recipients can access signing URLs
export async function submitZohoRequest(requestId: string) {
  const accessToken = await getZohoAccessToken();

  // Read actions to collect action_id and action_type
  const req = await getZohoRequest(requestId);
  const actionsArr = (req?.requests?.actions || req?.actions || []) as any[];
  const actionsPayload = actionsArr
    .map((a) => ({
      action_id: a?.action_id || a?.id,
      action_type: a?.action_type || a?.type || "SIGN",
    }))
    .filter((a) => a.action_id);

  const body = new URLSearchParams({
    data: JSON.stringify({
      requests: {
        actions: actionsPayload,
      },
    }),
  });

  const res = await fetch(`${ZOHO_SIGN_BASE}/requests/${requestId}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Zoho submit request failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

// Types and helpers for request creation
export type CreateZohoRequestOptions = {
  file: Blob;
  filename?: string;
  title: string;
  recipientName: string;
  recipientEmail: string;
  isEmbedded?: boolean;
  verifyRecipient?: boolean;
  verificationType?: "EMAIL" | "SMS";
  description?: string;
  expirationDays?: number;
  emailReminders?: boolean;
  reminderPeriod?: number;
  notes?: string;
  privateNotes?: string;
  redirectPages?: {
    sign_success?: string;
    sign_completed?: string;
    sign_declined?: string;
    sign_later?: string;
  };
};

// Create a Zoho Sign request with support for embedded signing and optional recipient verification
export async function createZohoRequest(opts: CreateZohoRequestOptions): Promise<{ requestId: string; signUrl?: string; actionId?: string; }>{
  const accessToken = await getZohoAccessToken();
  // Derive a sensible filename if not provided
  const derivedName = (opts.file as any)?.name as string | undefined;
  const finalFilename = opts.filename || derivedName || "document.pdf";

  // Always rewrap as an explicit PDF and validate header
  const ab = await opts.file.arrayBuffer();
  const headBuf = Buffer.from(new Uint8Array(ab).slice(0, 5));
  const headStr = headBuf.toString("ascii");
  if (!headStr.startsWith("%PDF")) {
    throw new Error(`PDF validation failed: missing %PDF header`);
  }
  const filePart = new File([ab], finalFilename, { type: "application/pdf" });
  const fileSize = (filePart as any)?.size as number | undefined;
  if (typeof fileSize === "number" && fileSize < 1024) {
    throw new Error(`PDF validation failed: file too small (${fileSize} bytes)`);
  }
  console.log("[zoho] Preparing upload", { filename: finalFilename, type: (filePart as any)?.type, size: fileSize });

  // Build payload: send data first, then file (some servers prefer this order)
  const buildForm = () => {
    const f = new FormData();
    f.append(
      "data",
      JSON.stringify({
        requests: {
          request_name: opts.title,
          description: opts.description ?? undefined,
          is_sequential: false,
          expiration_days: typeof opts.expirationDays === "number" ? opts.expirationDays : undefined,
          email_reminders: typeof opts.emailReminders === "boolean" ? opts.emailReminders : true,
          reminder_period: typeof opts.reminderPeriod === "number" ? opts.reminderPeriod : undefined,
          notes: opts.notes ?? undefined,
          actions: [
            {
              recipient_name: opts.recipientName.trim(),
              recipient_email: opts.recipientEmail.trim(),
              action_type: "SIGN",
              is_embedded: opts.isEmbedded ?? true,
              signing_order: 1,
              verify_recipient: opts.verifyRecipient ?? false,
              verification_type: opts.verificationType ?? undefined,
              private_notes: opts.privateNotes ?? undefined,
            },
          ],
          redirect_pages: opts.redirectPages ?? undefined,
        },
      })
    );
    f.append("file", filePart, finalFilename);
    return f;
  };

  const tryRequest = async (formBody: FormData) => {
    const res = await fetch(`${ZOHO_SIGN_BASE}/requests`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      body: formBody,
    });
    const text = await res.text();
    return { res, text };
  };

  // First attempt
  let { res, text } = await tryRequest(buildForm());
  if (!res.ok) {
    // Attempt a targeted fallback for file-related errors (e.g., Zoho 9039)
    let details: any = undefined;
    try { details = JSON.parse(text); } catch {}

    const isFileError = details && (details.code === 9039 || details.error_param === "file");
    if (isFileError) {
      console.warn("[zoho] create request failed with file error; retrying with alternate blob wrapper", details);
      const altBlob = new Blob([new Uint8Array(ab)], { type: "application/pdf" });
      const altForm = new FormData();
      altForm.append(
        "data",
        JSON.stringify({
          requests: {
            request_name: opts.title,
            description: opts.description ?? undefined,
            is_sequential: false,
            email_reminders: typeof opts.emailReminders === "boolean" ? opts.emailReminders : true,
            expiration_days: typeof opts.expirationDays === "number" ? opts.expirationDays : undefined,
            reminder_period: typeof opts.reminderPeriod === "number" ? opts.reminderPeriod : undefined,
            notes: opts.notes ?? undefined,
            actions: [
              {
                recipient_name: opts.recipientName.trim(),
                recipient_email: opts.recipientEmail.trim(),
                action_type: "SIGN",
                is_embedded: opts.isEmbedded ?? true,
                signing_order: 1,
                verify_recipient: opts.verifyRecipient ?? false,
                verification_type: opts.verificationType ?? undefined,
                private_notes: opts.privateNotes ?? undefined,
              },
            ],
            redirect_pages: opts.redirectPages ?? undefined,
          },
        })
      );
      altForm.append("file", altBlob, finalFilename);
      ({ res, text } = await tryRequest(altForm));
    }
  }

  if (!res.ok) {
    if (res.status === 400) {
      throw new Error(`Invalid request data: ${text}`);
    }
    if (res.status === 401) {
      throw new Error(`Authentication failed. Please check Zoho Sign credentials.`);
    }
    if (res.status === 403) {
      throw new Error(`Access denied. Please check Zoho Sign permissions.`);
    }
    if (res.status === 429) {
      throw new Error(`Rate limit exceeded. Please try again later.`);
    }
    throw new Error(`Zoho Sign request failed: ${res.status} - ${text}`);
  }

  const payload = JSON.parse(text);
  const requestId = payload?.requests?.request_id || payload?.request_id;
  if (!requestId) {
    throw new Error(`Invalid response from Zoho Sign: missing request_id`);
  }
  const action = payload?.requests?.actions?.[0] || payload?.actions?.[0];
  const signUrl = action?.sign_url;
  const actionId = action?.action_id || action?.id;
  return { requestId, signUrl, actionId };
}
// src/lib/zoho-workdrive.ts
import { NextResponse } from "next/server";

// Cache tokens to avoid hitting rate limits
let zohoTokenCache: { accessToken: string; expiresAt: number } | null = null;
let tokenFetchPromise: Promise<string> | null = null;

const ZOHO_REGION = process.env.ZOHO_REGION || "com";
const ZOHO_AUTH_BASE = `https://accounts.zoho.${ZOHO_REGION}`;

// CRM API endpoint
const ZOHO_CRM_BASE = `https://www.zohoapis.${ZOHO_REGION}/crm/v3`;
// WorkDrive API endpoint
const ZOHO_WORKDRIVE_BASE = `https://workdrive.zoho.${ZOHO_REGION}/api/v1`;

export async function getZohoAccessToken(): Promise<string> {
  if (zohoTokenCache && Date.now() < zohoTokenCache.expiresAt - 10000) {
    return zohoTokenCache.accessToken;
  }

  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  tokenFetchPromise = (async () => {
    try {
      const clientId = process.env.ZOHO_CRM_CLIENT_ID || process.env.ZOHO_CLIENT_ID || process.env.ZOHO_BIGIN_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CRM_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET || process.env.ZOHO_BIGIN_CLIENT_SECRET;
      const refreshToken = process.env.ZOHO_WORKDRIVE_REFRESH_TOKEN || process.env.ZOHO_CRM_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Zoho OAuth configuration missing.");
      }

      const url = `${ZOHO_AUTH_BASE}/oauth/v2/token`;
      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      });

      const res = await fetch(`${url}?${params.toString()}`, {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Zoho token request failed: ${res.status} - ${text}`);

      const data = JSON.parse(text);
      if (!data.access_token) throw new Error(`Invalid response: missing access_token`);

      const accessToken = data.access_token as string;
      const expiresIn = (data.expires_in as number | undefined) ?? 3600;

      zohoTokenCache = { accessToken, expiresAt: Date.now() + expiresIn * 1000 };
      return accessToken;
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
}

/**
 * Find contact in CRM by Email and return their WorkDrive_Folder_ID
 */
export async function getClientFolderIdFromCRM(email: string): Promise<string | null> {
  const token = await getZohoAccessToken();
  const res = await fetch(`${ZOHO_CRM_BASE}/Contacts/search?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (res.status === 204) return null; // No content = no matching record
  
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to fetch CRM contact: ${res.status} - ${text}`);
  }

  const data = JSON.parse(text);
  if (!data.data || data.data.length === 0) return null;

  const contact = data.data[0];
  
  // Custom fields in Zoho CRM usually replace spaces with underscores, e.g. "WorkDrive_Folder_ID"
  // Let's check both standard naming and underscore naming just in case
  const folderId = contact.WorkDrive_Folder_ID || contact["WorkDrive Folder ID"];
  
  return folderId ? String(folderId) : null;
}

/**
 * List files inside a WorkDrive folder
 */
export async function listWorkDriveFolder(folderId: string) {
  const token = await getZohoAccessToken();
  const res = await fetch(`${ZOHO_WORKDRIVE_BASE}/files/${folderId}/files`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      Accept: "application/vnd.api+json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to fetch WorkDrive folder: ${res.status} - ${text}`);
  }

  const data = JSON.parse(text);
  if (!data.data) return [];

  // Map the JSON:API format to a simpler structure
  return data.data.map((item: any) => ({
    id: item.id,
    name: item.attributes.name,
    extn: item.attributes.extn,
    size: item.attributes.size,
    created_time: item.attributes.created_time_in_millisecond,
    modified_time: item.attributes.modified_time_in_millisecond,
    type: item.attributes.type, // 'file' or 'folder'
    permalink: item.attributes.permalink,
  })).filter((item: any) => item.type === "1" || item.type === "file" || item.attributes?.is_folder === false || item.extn);
}

/**
 * Download a specific file from WorkDrive
 * WorkDrive download API returns a redirect or the file stream
 */
export async function getWorkDriveFileStream(fileId: string) {
  const token = await getZohoAccessToken();
  
  const res = await fetch(`${ZOHO_WORKDRIVE_BASE}/download/${fileId}`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
    },
    // Prevent Next.js from aggressively caching this request
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to download WorkDrive file: ${res.status} - ${text}`);
  }

  return res;
}

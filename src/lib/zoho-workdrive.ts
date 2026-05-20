// src/lib/zoho-workdrive.ts
import { NextResponse } from "next/server";

// Cache tokens to avoid hitting rate limits
let biginTokenCache: { accessToken: string; expiresAt: number } | null = null;
let workDriveTokenCache: { accessToken: string; expiresAt: number } | null = null;
let tokenFetchPromise: Promise<string> | null = null;

const ZOHO_REGION = process.env.ZOHO_REGION || "com";
const ZOHO_AUTH_BASE = `https://accounts.zoho.${ZOHO_REGION}`;

// Bigin API endpoint
const ZOHO_BIGIN_BASE = `https://www.zohoapis.${ZOHO_REGION}/bigin/v2`;
// WorkDrive API endpoint
const ZOHO_WORKDRIVE_BASE = `https://workdrive.zoho.${ZOHO_REGION}/api/v1`;

export async function getBiginAccessToken(): Promise<string> {
  if (biginTokenCache && Date.now() < biginTokenCache.expiresAt - 10000) {
    return biginTokenCache.accessToken;
  }

  const clientId = process.env.ZOHO_BIGIN_CLIENT_ID || process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_BIGIN_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_BIGIN_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Zoho Bigin OAuth configuration missing.");
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
  if (!res.ok) throw new Error(`Zoho Bigin token request failed: ${res.status} - ${text}`);

  const data = JSON.parse(text);
  if (!data.access_token) throw new Error(`Invalid response: missing access_token`);

  const accessToken = data.access_token as string;
  const expiresIn = (data.expires_in as number | undefined) ?? 3600;

  biginTokenCache = { accessToken, expiresAt: Date.now() + expiresIn * 1000 };
  return accessToken;
}

export async function getWorkDriveAccessToken(): Promise<string> {
  if (workDriveTokenCache && Date.now() < workDriveTokenCache.expiresAt - 10000) {
    return workDriveTokenCache.accessToken;
  }

  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  tokenFetchPromise = (async () => {
    try {
      const clientId = process.env.ZOHO_WORKDRIVE_CLIENT_ID || process.env.ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_WORKDRIVE_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET;
      const refreshToken = process.env.ZOHO_WORKDRIVE_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN;

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

      workDriveTokenCache = { accessToken, expiresAt: Date.now() + expiresIn * 1000 };
      return accessToken;
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
}


/**
 * Find contact in Bigin by Email and return their WorkDrive_Folder_ID
 */
export async function getClientFolderIdFromBigin(email: string): Promise<string | null> {
  const token = await getBiginAccessToken();
  const res = await fetch(`${ZOHO_BIGIN_BASE}/Contacts/search?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (res.status === 204) return null; // No content = no matching record
  
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to fetch Bigin contact: ${res.status} - ${text}`);
  }

  const data = JSON.parse(text);
  if (!data.data || data.data.length === 0) return null;

  const contact = data.data[0];
  
  const folderId = contact.Zoho_Workdrive_ID || contact.WorkDrive_Folder_ID || contact["WorkDrive Folder ID"];
  
  return folderId ? String(folderId) : null;
}

/**
 * List files inside a WorkDrive folder
 */
export async function listWorkDriveFolder(folderId: string) {
  const token = await getWorkDriveAccessToken();
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
  return data.data.map((item: any) => {
    const is_folder = item.attributes?.is_folder === true || item.type === "0" || item.type === "folder" || !item.attributes.extn;
    return {
      id: item.id,
      name: item.attributes.name,
      extn: item.attributes.extn,
      size: item.attributes.storage_info?.size_in_bytes || item.attributes.size || 0,
      created_time: item.attributes.created_time_in_millisecond,
      modified_time: item.attributes.modified_time_in_millisecond,
      type: item.attributes.type, // 'file' or 'folder'
      is_folder,
      permalink: item.attributes.permalink,
    };
  });
}

/**
 * Download a specific file from WorkDrive
 * WorkDrive download API returns a redirect or the file stream
 */
export async function getWorkDriveFileStream(fileId: string) {
  const token = await getWorkDriveAccessToken();
  
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

/**
 * Request folder zip creation via multizip and download the zip stream
 */
export async function getWorkDriveFolderZipStream(folderId: string) {
  const token = await getWorkDriveAccessToken();
  
  const multizipRes = await fetch(`${ZOHO_WORKDRIVE_BASE}/multizip`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          resource_id: folderId
        },
        type: "files"
      }
    }),
    cache: "no-store"
  });

  if (!multizipRes.ok) {
    const text = await multizipRes.text();
    throw new Error(`Failed to create WorkDrive folder ZIP: ${multizipRes.status} - ${text}`);
  }

  const data = await multizipRes.json();
  console.log("[WorkDrive Debug] Multizip Response Status:", multizipRes.status);
  console.log("[WorkDrive Debug] Multizip Response Data:", JSON.stringify(data));
  const dlLink = data.download_link;
  if (!dlLink) {
    throw new Error(`No download link returned from Zoho multizip API. Response keys: ${Object.keys(data || {}).join(", ")}`);
  }

  const parts = dlLink.split("/");
  const zipId = parts[parts.length - 1];

  const res = await fetch(`${ZOHO_WORKDRIVE_BASE}/download/${zipId}`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to download WorkDrive folder ZIP: ${res.status} - ${text}`);
  }

  return res;
}

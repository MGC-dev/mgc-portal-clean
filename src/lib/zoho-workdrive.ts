// src/lib/zoho-workdrive.ts
import { NextResponse } from "next/server";

// Cache tokens to avoid hitting rate limits
let biginTokenCache: { accessToken: string; expiresAt: number } | null = null;
let workDriveTokenCache: { accessToken: string; expiresAt: number } | null = null;
let workDriveTokenFetchPromise: Promise<string> | null = null;
let biginTokenFetchPromise: Promise<string> | null = null;

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

  if (biginTokenFetchPromise) {
    return biginTokenFetchPromise;
  }

  biginTokenFetchPromise = (async () => {
    try {
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
    } finally {
      biginTokenFetchPromise = null;
    }
  })();

  return biginTokenFetchPromise;
}

export async function getWorkDriveAccessToken(): Promise<string> {
  if (workDriveTokenCache && Date.now() < workDriveTokenCache.expiresAt - 10000) {
    return workDriveTokenCache.accessToken;
  }

  if (workDriveTokenFetchPromise) {
    return workDriveTokenFetchPromise;
  }

  workDriveTokenFetchPromise = (async () => {
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
      workDriveTokenFetchPromise = null;
    }
  })();

  return workDriveTokenFetchPromise;
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

export async function getBiginContactIdByEmail(email: string): Promise<string | null> {
  const token = await getBiginAccessToken();
  const res = await fetch(`${ZOHO_BIGIN_BASE}/Contacts/search?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (res.status === 204) return null;
  
  const text = await res.text();
  if (!res.ok) throw new Error(`Failed to fetch Bigin contact: ${res.status} - ${text}`);

  const data = JSON.parse(text);
  if (!data.data || data.data.length === 0) return null;

  return data.data[0].id || null;
}

export async function getAllSignedBiginContacts(): Promise<any[]> {
  const token = await getBiginAccessToken();

  // Explicitly request the Signed field — Bigin doesn't return custom fields by default
  const fields = "id,Full_Name,First_Name,Last_Name,Email,Phone,Account_Name,Signed,Zoho_Workdrive_ID,WorkDrive_Folder_ID";
  const res = await fetch(`${ZOHO_BIGIN_BASE}/Contacts?fields=${encodeURIComponent(fields)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (res.status === 204) return [];
  
  const text = await res.text();
  if (!res.ok) throw new Error(`Failed to fetch Bigin contacts: ${res.status} - ${text}`);

  const data = JSON.parse(text);
  if (!data.data) return [];

  // Log the raw first contact so we can see what field names Bigin returns
  if (data.data.length > 0) {
    console.log("[Bigin] First contact keys:", Object.keys(data.data[0]));
    console.log("[Bigin] First contact:", JSON.stringify(data.data[0]));
  }

  // Filter for Signed == true. Bigin returns booleans as actual booleans.
  return data.data.filter((c: any) => {
    const signed = c.Signed ?? c.Signed_Agreement ?? c.signed;
    return signed === true || signed === "true" || signed === "Yes" || signed === 1;
  });
}

export async function updateBiginContactWorkdriveId(contactId: string, folderId: string): Promise<void> {
  const token = await getBiginAccessToken();
  const res = await fetch(`${ZOHO_BIGIN_BASE}/Contacts`, {
    method: "PUT",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          id: contactId,
          WorkDrive_Folder_ID: folderId,
          Zoho_Workdrive_ID: folderId,
          "WorkDrive Folder ID": folderId
        }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update Bigin contact: ${res.status} - ${text}`);
  }
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

/**
 * Create a folder in WorkDrive
 */
export async function createWorkDriveFolder(parentFolderId: string, folderName: string) {
  const token = await getWorkDriveAccessToken();

  const res = await fetch(`${ZOHO_WORKDRIVE_BASE}/files`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          name: folderName,
          parent_id: parentFolderId,
        },
        type: "files"
      }
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to create WorkDrive folder: ${res.status} - ${text}`);
  }

  const data = JSON.parse(text);
  return data.data; // Returns folder metadata
}

/**
 * Upload a file to a WorkDrive folder
 */
export async function uploadFileToWorkDrive(parentFolderId: string, fileName: string, fileBuffer: Buffer) {
  const token = await getWorkDriveAccessToken();
  
  // Create a FormData payload
  const formData = new FormData();
  // Using Blob to attach buffer
  const blob = new Blob([new Uint8Array(fileBuffer)]);
  formData.append("content", blob, fileName);
  formData.append("parent_id", parentFolderId);
  formData.append("override-name-exist", "true");

  const ZOHO_UPLOAD_BASE = `https://workdrive.zoho.${ZOHO_REGION}/api/v1/upload`;

  const res = await fetch(ZOHO_UPLOAD_BASE, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      Accept: "application/vnd.api+json",
    },
    body: formData,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to upload file to WorkDrive: ${res.status} - ${text}`);
  }

  const data = JSON.parse(text);
  return data.data; // Returns file metadata
}

/**
 * Delete (move to trash) multiple files/folders in WorkDrive
 */
export async function deleteWorkDriveItems(itemIds: string[]) {
  if (!itemIds || itemIds.length === 0) return;
  const token = await getWorkDriveAccessToken();

  const res = await fetch(`${ZOHO_WORKDRIVE_BASE}/files`, {
    method: "PATCH",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: itemIds.map((id) => ({
        id,
        type: "files",
        attributes: {
          status: "51", // 51 = trash
        },
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete WorkDrive items: ${res.status} - ${text}`);
  }
}

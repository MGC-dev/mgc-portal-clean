// src/lib/zoho-workdrive.ts

/**
 * Zoho rate-limits refresh-token calls per token, and it counts *attempts* —
 * so retrying while limited pushes the unlock further out. A failed refresh
 * therefore starts a cooldown during which we don't call Zoho at all: we serve
 * a still-valid cached token if we have one, and otherwise fail immediately.
 */
type TokenState = {
  cache: { accessToken: string; expiresAt: number } | null;
  inFlight: Promise<string> | null;
  cooldownUntil: number;
  consecutiveFailures: number;
};

const biginToken: TokenState = { cache: null, inFlight: null, cooldownUntil: 0, consecutiveFailures: 0 };
const workDriveToken: TokenState = { cache: null, inFlight: null, cooldownUntil: 0, consecutiveFailures: 0 };

/** Raised when Zoho auth is unavailable. Routes turn this into a friendly 503. */
export class ZohoAuthError extends Error {
  readonly rateLimited: boolean;
  readonly retryAfterMs: number;
  constructor(message: string, opts: { rateLimited: boolean; retryAfterMs: number }) {
    super(message);
    this.name = "ZohoAuthError";
    this.rateLimited = opts.rateLimited;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

function isRateLimited(status: number, body: string): boolean {
  return (
    status === 429 ||
    /too many requests/i.test(body) ||
    /access denied/i.test(body)
  );
}

/** 1, 2, 4… minutes, capped at 15 — long enough for Zoho's window to reset. */
function cooldownFor(failures: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, failures - 1), 15 * 60_000);
}

async function getZohoToken(
  state: TokenState,
  label: string,
  creds: { clientId?: string; clientSecret?: string; refreshToken?: string }
): Promise<string> {
  const now = Date.now();

  // A token good for another 10s is good enough.
  if (state.cache && now < state.cache.expiresAt - 10_000) return state.cache.accessToken;

  // Collapse concurrent refreshes into one call.
  if (state.inFlight) return state.inFlight;

  if (now < state.cooldownUntil) {
    // Prefer a token that is stale-ish but not yet expired over failing.
    if (state.cache && now < state.cache.expiresAt) return state.cache.accessToken;
    throw new ZohoAuthError(
      `${label} authorisation is temporarily unavailable (rate limited by Zoho).`,
      { rateLimited: true, retryAfterMs: state.cooldownUntil - now }
    );
  }

  const { clientId, clientSecret, refreshToken } = creds;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new ZohoAuthError(`${label} OAuth configuration missing.`, {
      rateLimited: false,
      retryAfterMs: 0,
    });
  }

  state.inFlight = (async () => {
    try {
      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      });

      const res = await fetch(`${ZOHO_AUTH_BASE}/oauth/v2/token?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const text = await res.text();

      // Zoho reports rate limiting with a 400 and an error body, not a 429.
      if (!res.ok || isRateLimited(res.status, text)) {
        const limited = isRateLimited(res.status, text);
        if (limited) {
          state.consecutiveFailures += 1;
          state.cooldownUntil = Date.now() + cooldownFor(state.consecutiveFailures);
          console.warn(
            `[zoho] ${label} token rate limited; backing off for ${Math.round(
              cooldownFor(state.consecutiveFailures) / 1000
            )}s (failure #${state.consecutiveFailures})`
          );
        }
        throw new ZohoAuthError(
          limited
            ? `${label} authorisation is temporarily unavailable (rate limited by Zoho).`
            : `${label} token request failed: ${res.status} - ${text}`,
          { rateLimited: limited, retryAfterMs: limited ? state.cooldownUntil - Date.now() : 0 }
        );
      }

      const data = JSON.parse(text);
      if (!data.access_token) {
        throw new ZohoAuthError(`${label} returned no access_token.`, {
          rateLimited: false,
          retryAfterMs: 0,
        });
      }

      const expiresIn = (data.expires_in as number | undefined) ?? 3600;
      state.cache = { accessToken: data.access_token, expiresAt: Date.now() + expiresIn * 1000 };
      state.consecutiveFailures = 0;
      state.cooldownUntil = 0;
      return data.access_token as string;
    } finally {
      state.inFlight = null;
    }
  })();

  return state.inFlight;
}

const ZOHO_REGION = process.env.ZOHO_REGION || "com";
const ZOHO_AUTH_BASE = `https://accounts.zoho.${ZOHO_REGION}`;

// Bigin API endpoint
const ZOHO_BIGIN_BASE = `https://www.zohoapis.${ZOHO_REGION}/bigin/v2`;
// WorkDrive API endpoint
const ZOHO_WORKDRIVE_BASE = `https://workdrive.zoho.${ZOHO_REGION}/api/v1`;

export async function getBiginAccessToken(): Promise<string> {
  return getZohoToken(biginToken, "Zoho Bigin", {
    clientId: process.env.ZOHO_BIGIN_CLIENT_ID || process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_BIGIN_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_BIGIN_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN,
  });
}

export async function getWorkDriveAccessToken(): Promise<string> {
  return getZohoToken(workDriveToken, "Zoho WorkDrive", {
    clientId: process.env.ZOHO_WORKDRIVE_CLIENT_ID || process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_WORKDRIVE_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_WORKDRIVE_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN,
  });
}

/**
 * Message safe to show a client. Upstream provider errors leak vendor names,
 * status codes and raw JSON — useless to a client and needless detail to
 * expose. The full error is still logged server-side.
 */
export function clientSafeZohoMessage(error: unknown): string {
  if (error instanceof ZohoAuthError && error.rateLimited) {
    const mins = Math.max(1, Math.ceil(error.retryAfterMs / 60_000));
    return `Our document service is busy right now. Please try again in about ${mins} minute${mins === 1 ? "" : "s"}.`;
  }
  return "We couldn't reach your documents just now. Please try again shortly.";
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

/**
 * Company name for a Bigin contact. Account_Name comes back as a lookup object
 * ({ id, name }) on some endpoints and as a plain string on others.
 */
export function getBiginCompanyName(contact: any): string {
  const account = contact?.Account_Name;
  const company = typeof account === "string" ? account : account?.name;
  return (
    company ||
    contact?.Full_Name ||
    `${contact?.First_Name || ""} ${contact?.Last_Name || ""}`.trim() ||
    contact?.Email ||
    ""
  );
}

export function getBiginContactFolderId(contact: any): string | null {
  const folderId =
    contact?.Zoho_Workdrive_ID || contact?.WorkDrive_Folder_ID || contact?.["WorkDrive Folder ID"];
  return folderId ? String(folderId) : null;
}

// WorkDrive happily creates two folders with the same name (it just appends a
// timestamp), so the only thing preventing duplicates is the folder ID stored on
// the Bigin contact. Overlapping requests — two admins, a double refresh, React
// strict-mode's double fetch — can all race that write, so provisioning per
// contact is deduped in-process while it is in flight.
const inFlightFolderProvisioning = new Map<string, Promise<string | null>>();

/**
 * Make sure a signed client has a root WorkDrive folder, creating it (named
 * after their company) and linking it back to Bigin the first time.
 *
 * Idempotent: contacts that already carry a folder ID are returned untouched.
 * Returns the folder ID, or null if it could not be provisioned.
 */
export async function ensureClientRootFolder(contact: any): Promise<string | null> {
  const existing = getBiginContactFolderId(contact);
  if (existing) return existing;

  if (!contact?.id) return null;

  const pending = inFlightFolderProvisioning.get(contact.id);
  if (pending) return pending;

  const provisioning = provisionClientRootFolder(contact).finally(() => {
    inFlightFolderProvisioning.delete(contact.id);
  });
  inFlightFolderProvisioning.set(contact.id, provisioning);

  return provisioning;
}

async function provisionClientRootFolder(contact: any): Promise<string | null> {
  const parentFolderId = process.env.NEXT_PUBLIC_WORKDRIVE_CLIENT_DOCUMENTS_FOLDER_ID;
  if (!parentFolderId) {
    console.warn("[workdrive] NEXT_PUBLIC_WORKDRIVE_CLIENT_DOCUMENTS_FOLDER_ID is not set; skipping folder provisioning.");
    return null;
  }

  const folderName = getBiginCompanyName(contact);
  if (!folderName) return null;

  // Re-read from Bigin so a folder linked by another process (or an earlier
  // request whose write landed after our list was fetched) is not duplicated.
  if (contact.Email) {
    const linked = await getClientFolderIdFromBigin(contact.Email);
    if (linked) return linked;
  }

  const newFolder = await createWorkDriveFolder(parentFolderId, folderName);
  const newFolderId: string | undefined = newFolder?.id;
  if (!newFolderId) return null;

  await updateBiginContactWorkdriveId(contact.id, newFolderId);
  console.log(`[workdrive] Provisioned folder "${folderName}" (${newFolderId}) for signed client ${contact.Email || contact.id}`);

  return newFolderId;
}

// Same race as client root folders: WorkDrive will happily create a second
// "Meetings" folder rather than reject the duplicate, and two webhooks for the
// same client can arrive together. Dedupe per parent+name while in flight.
const inFlightSubfolders = new Map<string, Promise<string | null>>();

/**
 * Find a subfolder by name under `parentFolderId`, creating it if absent.
 * Returns the subfolder ID, or null if it could not be created.
 */
export async function ensureWorkDriveSubfolder(
  parentFolderId: string,
  folderName: string
): Promise<string | null> {
  const key = `${parentFolderId}::${folderName.toLowerCase()}`;
  const pending = inFlightSubfolders.get(key);
  if (pending) return pending;

  const provisioning = (async () => {
    const items = await listWorkDriveFolder(parentFolderId);
    const existing = items.find(
      (item: any) => item.is_folder && String(item.name).toLowerCase() === folderName.toLowerCase()
    );
    if (existing) return String(existing.id);

    const created = await createWorkDriveFolder(parentFolderId, folderName);
    const createdId: string | undefined = created?.id;
    if (!createdId) return null;

    console.log(`[workdrive] Created "${folderName}" folder (${createdId}) under ${parentFolderId}`);
    return String(createdId);
  })().finally(() => {
    inFlightSubfolders.delete(key);
  });

  inFlightSubfolders.set(key, provisioning);
  return provisioning;
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

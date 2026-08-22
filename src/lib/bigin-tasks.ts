import { getBiginAccessToken, getBiginContactIdByEmail } from "./zoho-workdrive";

const ZOHO_REGION = process.env.ZOHO_REGION || "com";
const ZOHO_BIGIN_BASE = `https://www.zohoapis.${ZOHO_REGION}/bigin/v2`;

// Client tasks live in Bigin's Pipelines module under the "MG Client Task
// Tracker" team pipeline. The same module also holds the onboarding pipelines,
// so every read filters down to this one.
const TASK_PIPELINE_ID = process.env.ZOHO_BIGIN_TASK_PIPELINE_ID || "6467760000001176002";
const TASK_PIPELINE_NAME = "MG Client Task Tracker";

// Bigin returns the pipeline as `Pipeline` on list/related-list reads and as
// `Layout` on search reads — same record, different key.
function pipelineOf(record: any): { id?: string; name?: string } {
  const p = record?.Pipeline || record?.Layout;
  return { id: p?.id, name: p?.name || p?.display_label };
}

export type ClientTaskStage = "start" | "in_progress" | "done";

export type ClientTask = {
  id: string;
  title: string;
  stage: ClientTaskStage;
  dueDate: string | null;
  description: string | null;
  modifiedTime: string | null;
};

export type ClientTaskBoard = {
  start: ClientTask[];
  in_progress: ClientTask[];
  done: ClientTask[];
};

// The four board stages collapse into the three the client sees. "On Hold" is a
// live stage staff may start using, so it maps to In Progress rather than
// vanishing from the client's view.
const STAGE_MAP: Record<string, ClientTaskStage> = {
  "new task": "start",
  working: "in_progress",
  "on hold": "in_progress",
  completed: "done",
};

// An unrecognised stage means someone added a column in Bigin. Show it as In
// Progress: a task that exists but isn't explicitly complete is better shown
// mid-flight than hidden from the client entirely.
function mapStage(stage: unknown): ClientTaskStage {
  return STAGE_MAP[String(stage ?? "").trim().toLowerCase()] ?? "in_progress";
}

// Bigin returns *only* the fields named here, so `Pipeline` has to be requested
// explicitly — without it every record comes back with no pipeline and the
// filter below silently drops the whole board.
const FIELDS =
  "id,Deal_Name,Stage,Pipeline,Closing_Date,Contact_Name,Account_Name,Description,Modified_Time";

/**
 * Every task-tracker record linked to a Bigin contact, newest board state first.
 */
export async function getClientTasksByContactId(contactId: string): Promise<ClientTask[]> {
  const token = await getBiginAccessToken();
  const criteria = `(Contact_Name.id:equals:${contactId})`;

  const records: any[] = [];
  // Bigin caps a page at 200; page through so a long-running client doesn't
  // silently lose the tail of their board.
  for (let page = 1; page <= 10; page++) {
    const url =
      `${ZOHO_BIGIN_BASE}/Pipelines/search` +
      `?criteria=${encodeURIComponent(criteria)}` +
      `&fields=${encodeURIComponent(FIELDS)}` +
      `&per_page=200&page=${page}`;

    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    if (res.status === 204) break; // no (more) matching records

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Failed to fetch Bigin tasks: ${res.status} - ${text}`);
    }

    const data = JSON.parse(text);
    records.push(...(data.data || []));
    if (!data.info?.more_records) break;
  }

  return records
    .filter((r) => {
      const { id, name } = pipelineOf(r);
      return id === TASK_PIPELINE_ID || name === TASK_PIPELINE_NAME;
    })
    .map((r) => ({
      id: String(r.id),
      title: r.Deal_Name || "Untitled task",
      stage: mapStage(r.Stage),
      dueDate: r.Closing_Date || null,
      description: r.Description || null,
      modifiedTime: r.Modified_Time || null,
    }));
}

// The portal polls this every 45s per open tab, and an email's contact id is
// effectively immutable — caching it halves the Bigin calls per poll. Short TTL
// so a contact that gets recreated is picked up without a redeploy.
const CONTACT_ID_TTL_MS = 10 * 60 * 1000;
const contactIdCache = new Map<string, { id: string | null; expiresAt: number }>();

export async function getClientTasksByEmail(email: string): Promise<ClientTask[]> {
  const key = email.toLowerCase();
  const cached = contactIdCache.get(key);

  let contactId: string | null;
  if (cached && Date.now() < cached.expiresAt) {
    contactId = cached.id;
  } else {
    contactId = await getBiginContactIdByEmail(email);
    contactIdCache.set(key, { id: contactId, expiresAt: Date.now() + CONTACT_ID_TTL_MS });
  }

  if (!contactId) return [];
  return getClientTasksByContactId(contactId);
}

/**
 * Group tasks into the three client-facing columns. Open work sorts by due date
 * (soonest first, undated last) so the next thing due is at the top; completed
 * work sorts by most recently finished.
 */
export function groupClientTasks(tasks: ClientTask[]): ClientTaskBoard {
  const board: ClientTaskBoard = { start: [], in_progress: [], done: [] };
  for (const task of tasks) board[task.stage].push(task);

  const byDueDate = (a: ClientTask, b: ClientTask) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  };
  const byRecent = (a: ClientTask, b: ClientTask) =>
    (b.modifiedTime || "").localeCompare(a.modifiedTime || "");

  board.start.sort(byDueDate);
  board.in_progress.sort(byDueDate);
  board.done.sort(byRecent);
  return board;
}

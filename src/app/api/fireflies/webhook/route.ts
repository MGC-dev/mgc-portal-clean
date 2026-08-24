import { NextResponse } from "next/server";
import {
  getFirefliesTranscript,
  verifyFirefliesSignature,
  attendeeEmails,
  transcriptToPlainText,
  meetingDate,
} from "@/lib/fireflies";
import { summarizeMeeting } from "@/lib/meeting-summary";
import { buildMeetingSummaryDocx, meetingDocFileName } from "@/lib/meeting-doc";
import {
  getAllSignedBiginContacts,
  ensureClientRootFolder,
  ensureWorkDriveSubfolder,
  uploadFileToWorkDrive,
} from "@/lib/zoho-workdrive";
import { MEETINGS_FOLDER_NAME } from "@/lib/meetings-folder";

// Summarising a long transcript plus uploading per client takes far longer than
// the default serverless timeout.
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Names Fireflies uses for "the transcript is ready" — the docs and the webhook
 * settings UI disagree, so both are honoured. "Meeting Summarized" and
 * "Meeting Bot Joined" are deliberately excluded: the first would re-deliver a
 * document for a meeting already handled, and the second fires before any
 * transcript exists.
 */
const TRANSCRIPT_READY_EVENTS = ["transcription completed", "meeting transcribed"];

function isTranscriptReadyEvent(eventType: unknown): boolean {
  return TRANSCRIPT_READY_EVENTS.includes(String(eventType ?? "").trim().toLowerCase());
}

export async function POST(request: Request) {
  // The raw body is required for signature verification — parsing first and
  // re-serialising would change the bytes and break the HMAC.
  const rawBody = await request.text();

  const secret = process.env.FIREFLIES_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed. This endpoint spends Claude tokens and writes documents into
    // client folders, so it must never be callable by anyone who finds the URL.
    console.error("[fireflies] FIREFLIES_WEBHOOK_SECRET is not set; rejecting webhook.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-hub-signature");
  if (!verifyFirefliesSignature(rawBody, signature, secret)) {
    // Diagnostic — header names only, never values, so nothing secret is logged.
    // Distinguishes "no signature sent" (e.g. an unsigned test event) from
    // "signature present but the secret does not match".
    const headerNames = [...request.headers.keys()].join(", ");
    console.warn(
      `[fireflies] Rejected webhook with invalid signature. ` +
        `x-hub-signature present: ${signature !== null} ` +
        `(len ${signature?.length ?? 0}, prefix ${JSON.stringify(signature?.slice(0, 7) ?? "")}); ` +
        `bodyLen ${rawBody.length}; headers: [${headerNames}]`
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { meetingId?: string; eventType?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const { meetingId, eventType } = payload;

  // Fireflies' docs say this string is "Transcription completed", but the
  // webhook UI lists the same event as "Meeting Transcribed". Matching one
  // spelling exactly would silently no-op the whole pipeline if the payload
  // used the other, so both are accepted — and the raw value is always logged
  // so the true string is visible after the first real delivery.
  console.log(`[fireflies] Received eventType: ${JSON.stringify(eventType)} (meetingId: ${meetingId})`);

  if (!isTranscriptReadyEvent(eventType)) {
    // Acknowledge so Fireflies doesn't retry an event we simply don't handle.
    return NextResponse.json({ ok: true, skipped: `Unhandled eventType: ${eventType}` });
  }
  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  try {
    const result = await processMeeting(meetingId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error(`[fireflies] Failed to process meeting ${meetingId}:`, error);
    // 500 lets Fireflies retry; uploads are keyed on the transcript id and
    // overwrite by name, so a retry re-delivers rather than duplicating.
    return NextResponse.json(
      { error: error?.message || "Failed to process meeting" },
      { status: 500 }
    );
  }
}

async function processMeeting(meetingId: string) {
  const transcript = await getFirefliesTranscript(meetingId);

  const emails = attendeeEmails(transcript);
  if (emails.length === 0) {
    return { delivered: [], skipped: "Meeting had no attendee emails" };
  }

  // One Bigin read for all signed clients, then intersect with the attendee
  // list — cheaper and more predictable than a lookup per attendee.
  const signedContacts = await getAllSignedBiginContacts();
  const byEmail = new Map<string, any>();
  for (const contact of signedContacts) {
    const email = String(contact?.Email || "").trim().toLowerCase();
    if (email) byEmail.set(email, contact);
  }

  const matched = emails
    .map((email) => byEmail.get(email))
    .filter((contact): contact is any => !!contact);

  if (matched.length === 0) {
    console.log(`[fireflies] Meeting ${meetingId}: no signed clients among attendees, skipping.`);
    return { delivered: [], skipped: "No signed clients attended" };
  }

  const transcriptText = transcriptToPlainText(transcript);
  if (!transcriptText.trim()) {
    return { delivered: [], skipped: "Transcript had no sentences" };
  }

  const date = meetingDate(transcript);
  const dateIso = (date ?? new Date()).toISOString().slice(0, 10);
  const dateLabel = date
    ? date.toLocaleDateString("en-US", { dateStyle: "long" })
    : "Date not recorded";
  const durationLabel =
    typeof transcript.duration === "number" ? `${Math.round(transcript.duration)} min` : "—";
  const meetingTitle = transcript.title || "Meeting";

  const attendeeLabels = (transcript.meeting_attendees || [])
    .map((a) => a?.displayName || a?.name || a?.email)
    .filter((n): n is string => !!n);

  // Summarise and render once, then fan the same document out to each attending
  // client — the meeting is the same meeting for all of them.
  const summary = await summarizeMeeting({
    title: meetingTitle,
    dateLabel,
    attendees: attendeeLabels,
    transcriptText,
  });

  const docBuffer = await buildMeetingSummaryDocx({
    summary,
    meetingTitle,
    dateLabel,
    durationLabel,
    attendees: attendeeLabels,
  });

  const fileName = meetingDocFileName(dateIso, summary.headline || meetingTitle, transcript.id);

  const delivered: { email: string; folderId: string }[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const contact of matched) {
    const email = String(contact.Email);
    try {
      const rootFolderId = await ensureClientRootFolder(contact);
      if (!rootFolderId) {
        failed.push({ email, error: "No WorkDrive root folder could be provisioned" });
        continue;
      }

      const meetingsFolderId = await ensureWorkDriveSubfolder(rootFolderId, MEETINGS_FOLDER_NAME);
      if (!meetingsFolderId) {
        failed.push({ email, error: "Could not create Meetings folder" });
        continue;
      }

      await uploadFileToWorkDrive(meetingsFolderId, fileName, docBuffer);
      delivered.push({ email, folderId: meetingsFolderId });
      console.log(`[fireflies] Delivered "${fileName}" to ${email}`);
    } catch (error: any) {
      // One client's failure must not block the others on the same call.
      console.error(`[fireflies] Delivery to ${email} failed:`, error);
      failed.push({ email, error: error?.message || "Upload failed" });
    }
  }

  return { meetingId, fileName, delivered, failed };
}

import { NextResponse } from "next/server";
import { verifyFirefliesSignature, diagnoseFirefliesSignature } from "@/lib/fireflies";
import { processMeeting } from "@/lib/fireflies-pipeline";

// Summarising a long transcript plus uploading per client takes far longer than
// the default serverless timeout.
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Values Fireflies uses for "the transcript is ready". The live payload sends
 * `event: "meeting.transcribed"` — which is NOT what the docs or the settings UI
 * show ("Transcription completed" / "Meeting Transcribed"), so all three spellings
 * are honoured. "Meeting Summarized" and "Meeting Bot Joined" are deliberately
 * excluded: the first would re-deliver a document for a meeting already handled,
 * and the second fires before any transcript exists.
 */
const TRANSCRIPT_READY_EVENTS = [
  "meeting.transcribed",
  "transcription completed",
  "meeting transcribed",
];

function isTranscriptReadyEvent(eventType: unknown): boolean {
  return TRANSCRIPT_READY_EVENTS.includes(String(eventType ?? "").trim().toLowerCase());
}

export async function POST(request: Request) {
  // The raw body is required for signature verification — parsing first and
  // re-serialising would change the bytes and break the HMAC.
  const rawBody = await request.text();

  // Trimmed: pasting a secret into a dashboard env field commonly appends a
  // trailing newline/space, which silently breaks the HMAC for a secret that is
  // otherwise correct.
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Fail closed. This endpoint spends Claude tokens and writes documents into
    // client folders, so it must never be callable by anyone who finds the URL.
    console.error("[fireflies] FIREFLIES_WEBHOOK_SECRET is not set; rejecting webhook.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-hub-signature");
  if (!verifyFirefliesSignature(rawBody, signature, secret)) {
    // Diagnostic — no digest bytes are logged. If the header is present and
    // well-formed but neither hexMatch nor base64Match is true, the secret we
    // hold differs from the one Fireflies signed with (fix the config, not code).
    const diag = diagnoseFirefliesSignature(rawBody, signature, secret);
    console.warn(
      `[fireflies] Rejected webhook with invalid signature. ` +
        `hasHeader=${diag.hasHeader} hasSecret=${diag.hasSecret} ` +
        `hexMatch=${diag.hexMatch} base64Match=${diag.base64Match} ` +
        `providedLen=${diag.providedLen} bodyLen=${rawBody.length}`
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event?: string;
    eventType?: string;
    meeting_id?: string;
    meetingId?: string;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  // The live payload uses snake_case `event` / `meeting_id`; the documented
  // camelCase names are kept as fallbacks in case Fireflies ever aligns to them.
  const meetingId = payload.meeting_id ?? payload.meetingId;
  const eventType = payload.event ?? payload.eventType;

  // The body carries only an event name + meeting id (no transcript content),
  // so logging it is safe and surfaces the exact payload shape if it ever drifts.
  console.log(
    `[fireflies] Received eventType: ${JSON.stringify(eventType)} (meetingId: ${meetingId}); ` +
      `rawBody: ${rawBody.slice(0, 300)}`
  );

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

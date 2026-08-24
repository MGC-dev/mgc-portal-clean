/**
 * POST /api/dev/fireflies/reprocess — { meetingId: string }
 *
 * Developer-only. Runs the exact same pipeline the Fireflies webhook runs, but
 * on demand: fetch the transcript, summarise it, and deliver the document to
 * each attending signed client's WorkDrive. Useful for replaying a meeting the
 * webhook already acknowledged (and therefore will not resend), or for testing
 * without recording a fresh call.
 */

import { NextResponse } from "next/server";
import { getDeveloperContext } from "@/lib/dev/access";
import { processMeeting } from "@/lib/fireflies-pipeline";
import { logDevEvent } from "@/lib/dev/events";

// Matches the webhook: summarising + per-client upload can exceed the default.
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const meetingId = typeof body?.meetingId === "string" ? body.meetingId.trim() : "";
  if (!meetingId) {
    return NextResponse.json({ error: "`meetingId` is required" }, { status: 400 });
  }

  try {
    const result = await processMeeting(meetingId);

    await logDevEvent({
      level: result.failed && result.failed.length > 0 ? "warn" : "info",
      source: "fireflies",
      message: result.skipped
        ? `Reprocessed meeting ${meetingId} — skipped: ${result.skipped}`
        : `Reprocessed meeting ${meetingId} — delivered to ${result.delivered?.length ?? 0} client(s)`,
      meta: { meetingId, ...result },
      actorEmail: user?.email ?? null,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    const message = error?.message || "Failed to process meeting";
    await logDevEvent({
      level: "error",
      source: "fireflies",
      message: `Reprocess of meeting ${meetingId} failed: ${message}`,
      meta: { meetingId },
      actorEmail: user?.email ?? null,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

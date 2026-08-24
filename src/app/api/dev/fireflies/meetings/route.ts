/**
 * GET /api/dev/fireflies/meetings — recent Fireflies transcripts
 *
 * Developer-only. Lets the console list recent meetings (with the emails the
 * matching step will actually see) so one can be reprocessed without hunting
 * its id out of the server logs.
 */

import { NextResponse } from "next/server";
import { getDeveloperContext } from "@/lib/dev/access";
import { listRecentFirefliesTranscripts } from "@/lib/fireflies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const transcripts = await listRecentFirefliesTranscripts(10);

    const meetings = transcripts.map((t) => {
      const attendees = (t.meeting_attendees || [])
        .map((a) => a?.email)
        .filter((e): e is string => !!e);
      const emails = [
        ...new Set(
          [...attendees, ...(t.participants || []), t.organizer_email]
            .map((e) => e?.trim().toLowerCase())
            .filter((e): e is string => !!e && e.includes("@"))
        ),
      ];

      return {
        id: t.id,
        title: t.title,
        date: t.date ? new Date(Number(t.date)).toISOString() : null,
        duration: t.duration,
        emails,
      };
    });

    return NextResponse.json({ meetings });
  } catch (e: any) {
    return NextResponse.json({ error: `${e?.message || e}` }, { status: 500 });
  }
}

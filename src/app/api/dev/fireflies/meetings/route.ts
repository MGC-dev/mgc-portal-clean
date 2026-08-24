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
    // Fireflies does not document a default ordering, so pull the maximum the
    // API allows and sort newest-first here rather than trusting the response
    // order — otherwise the most recent meeting can be missing from a short page.
    const transcripts = await listRecentFirefliesTranscripts(50);

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

      const ms = t.date === null || t.date === undefined ? NaN : Number(t.date);
      return {
        id: t.id,
        title: t.title,
        date: Number.isNaN(ms) ? null : new Date(ms).toISOString(),
        sortKey: Number.isNaN(ms) ? 0 : ms,
        duration: t.duration,
        emails,
      };
    });

    meetings.sort((a, b) => b.sortKey - a.sortKey);

    return NextResponse.json({
      meetings: meetings.slice(0, 20).map(({ sortKey: _sortKey, ...m }) => m),
      totalOnAccount: transcripts.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `${e?.message || e}` }, { status: 500 });
  }
}

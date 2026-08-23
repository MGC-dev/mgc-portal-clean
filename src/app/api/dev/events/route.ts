/**
 * GET  /api/dev/events — recent dev events (audit trail + error log)
 * POST /api/dev/events — record an event manually
 *
 * Developer-only. Server code should call logDevEvent() directly instead of
 * posting here.
 */

import { NextResponse } from "next/server";
import { getDeveloperContext } from "@/lib/dev/access";
import { listDevEvents, logDevEvent, type DevEventLevel } from "@/lib/dev/events";

export const dynamic = "force-dynamic";

const LEVELS: DevEventLevel[] = ["info", "warn", "error"];

export async function GET(request: Request) {
  const { isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const levelParam = searchParams.get("level");
  const level =
    levelParam && LEVELS.includes(levelParam as DevEventLevel)
      ? (levelParam as DevEventLevel)
      : "all";

  try {
    const events = await listDevEvents({
      limit: Number(searchParams.get("limit") ?? 100),
      level,
      source: searchParams.get("source") ?? undefined,
    });
    return NextResponse.json({ events });
  } catch (e: any) {
    const message = `${e?.message || e}`;
    const missingTable = /dev_events/.test(message) && /does not exist|schema cache/i.test(message);
    return NextResponse.json(
      {
        error: missingTable
          ? "dev_events table not found — run supabase-dev-dashboard.sql in the Supabase SQL editor"
          : message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { user, isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body?.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "`message` is required" }, { status: 400 });
  }

  await logDevEvent({
    level: LEVELS.includes(body.level) ? body.level : "info",
    source: typeof body.source === "string" && body.source ? body.source : "manual",
    message: body.message,
    meta: typeof body.meta === "object" && body.meta ? body.meta : {},
    actorEmail: user?.email ?? null,
  });

  return NextResponse.json({ ok: true });
}

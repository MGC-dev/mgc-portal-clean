/**
 * GET  /api/dev/maintenance — current maintenance state
 * POST /api/dev/maintenance — toggle it { enabled: boolean, message?: string }
 *
 * Developer-only. Every toggle is written to dev_events with the actor's email.
 */

import { NextResponse } from "next/server";
import { getDeveloperContext } from "@/lib/dev/access";
import { readMaintenanceState, writeMaintenanceState } from "@/lib/dev/maintenance";
import { logDevEvent } from "@/lib/dev/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const { isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    return NextResponse.json({ maintenance: await readMaintenanceState() });
  } catch (e: any) {
    return NextResponse.json({ error: `${e?.message || e}` }, { status: 500 });
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

  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "`enabled` must be a boolean" }, { status: 400 });
  }

  try {
    const state = await writeMaintenanceState({
      enabled: body.enabled,
      message: typeof body.message === "string" ? body.message : undefined,
      actorEmail: user?.email ?? null,
    });

    await logDevEvent({
      level: body.enabled ? "warn" : "info",
      source: "maintenance",
      message: body.enabled
        ? "Maintenance mode ENABLED — the site is closed to clients and admins"
        : "Maintenance mode DISABLED — the site is live again",
      meta: { message: state.message },
      actorEmail: user?.email ?? null,
    });

    return NextResponse.json({ maintenance: state });
  } catch (e: any) {
    return NextResponse.json({ error: `${e?.message || e}` }, { status: 500 });
  }
}

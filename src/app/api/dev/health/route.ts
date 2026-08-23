/**
 * GET /api/dev/health — runs every live dependency check and returns results.
 * Developer-only. Read-only checks; safe to re-run at any time.
 */

import { NextResponse } from "next/server";
import { getDeveloperContext } from "@/lib/dev/access";
import { runHealthChecks, summariseChecks } from "@/lib/dev/health";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const { isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const startedAt = Date.now();
  const checks = await runHealthChecks();

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    totalMs: Date.now() - startedAt,
    summary: summariseChecks(checks),
    checks,
  });
}

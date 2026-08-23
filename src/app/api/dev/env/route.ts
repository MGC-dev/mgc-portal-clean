/**
 * GET /api/dev/env — which environment variables are set, and a fingerprint of
 * each. Secret values are never included in the response. Developer-only.
 */

import { NextResponse } from "next/server";
import { getDeveloperContext } from "@/lib/dev/access";
import { inspectEnv, summariseEnv } from "@/lib/dev/env-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const { isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const variables = inspectEnv();
  return NextResponse.json({ summary: summariseEnv(variables), variables });
}

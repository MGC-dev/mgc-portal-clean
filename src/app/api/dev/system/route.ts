/**
 * GET /api/dev/system — runtime, hosting, build and git information.
 * Developer-only.
 */

import { NextResponse } from "next/server";
import { getDeveloperContext } from "@/lib/dev/access";
import { getSystemInfo } from "@/lib/dev/system";

export const dynamic = "force-dynamic";

export async function GET() {
  const { isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ system: getSystemInfo() });
}

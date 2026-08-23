/**
 * GET /api/dev/session — auth inspector: the current user, their profile, JWT
 * claims and which Supabase cookies are present. Developer-only.
 *
 * Cookie VALUES are never returned — only names and sizes.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDeveloperContext } from "@/lib/dev/access";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, profile, isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cookieStore = await cookies();
  const cookieSummary = cookieStore
    .getAll()
    .map((c) => ({ name: c.name, bytes: c.value.length }))
    .sort((a, b) => a.name.localeCompare(b.name));

  let sessionInfo: {
    expiresAt: string | null;
    provider: string | null;
    tokenBytes: number | null;
  } = { expiresAt: null, provider: null, tokenBytes: null };

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session) {
      sessionInfo = {
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        provider: (session.user?.app_metadata as any)?.provider ?? null,
        tokenBytes: session.access_token?.length ?? null,
      };
    }
  } catch {
    // Session details are best-effort — the identity above is what matters.
  }

  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
          lastSignInAt: (user as any).last_sign_in_at ?? null,
          emailConfirmedAt: (user as any).email_confirmed_at ?? null,
          appMetadata: user.app_metadata ?? null,
          userMetadata: user.user_metadata ?? null,
        }
      : null,
    profile: profile
      ? {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name ?? null,
          role: profile.role ?? null,
          suspended: Boolean(profile.suspended),
          createdAt: profile.created_at ?? null,
        }
      : null,
    session: sessionInfo,
    cookies: cookieSummary,
  });
}

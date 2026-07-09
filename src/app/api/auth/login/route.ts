import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * ORPHANED ROUTE — DO NOT USE FROM UI CODE
 *
 * Login must happen via the browser Supabase client (createClient() from
 * @/lib/supabase) so the session refresh timer is owned by the browser.
 * Signing in here gives the browser an ownerless session that expires with
 * nothing to renew it, causing 401s on all /api/admin/* routes after ~1 hour.
 *
 * This route is believed to be unreachable from the current UI.
 * A console.error is present to confirm this in Vercel logs before retirement.
 * Once one full production login cycle shows no log line from here, delete it.
 */
export async function POST(req: Request) {
  console.error(
    "[ORPHANED LOGIN ROUTE] /api/auth/login was called — this should NOT happen. " +
    "Login must use the browser Supabase client. Check for any fetch() or redirect " +
    "pointing to this route and remove it immediately."
  );

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password: String(password),
    });

    if (error) {
      const status = (error as any)?.status ?? 400;
      return NextResponse.json({ error: error.message || "Authentication failed" }, { status });
    }

    return NextResponse.json({ user: data.user ?? null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error during login" },
      { status: 500 }
    );
  }
}
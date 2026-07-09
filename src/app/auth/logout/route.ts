import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * POST /auth/logout  (preferred — not prefetchable by Next.js)
 *
 * Trigger from a <form method="POST"> or fetch('/auth/logout', { method: 'POST' })
 * to avoid the risk of a GET link being prefetched and silently clearing the session.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore; proceed with redirect regardless
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

/**
 * GET /auth/logout  (kept for backward compatibility)
 *
 * Used by logout-button.tsx via window.location.href — a deliberate user
 * navigation, not a prefetch risk. Do NOT add <Link href="/auth/logout"> links
 * in the UI; use the POST handler or the client-side signOut() from useAuth().
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore errors; proceed with redirect
  }
  const redirectUrl = new URL("/login", request.url);
  return NextResponse.redirect(redirectUrl);
}
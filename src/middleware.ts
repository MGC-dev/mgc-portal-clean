/**
 * Next.js Middleware — Supabase session refresh
 *
 * Runs on ALL routes (pages AND /api). This is required so that:
 *   1. The session cookie is refreshed before any route handler runs
 *   2. Route handlers receive up-to-date cookies via the forwarded request
 *
 * For API routes: session is refreshed and passed through — no redirects.
 * For page routes: session is refreshed, then routing/redirect logic runs.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // supabaseResponse must be returned at the end (or used as base for redirects)
  // so that refreshed session cookies are forwarded to the route handler and browser.
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Step 1: write updated cookies onto the incoming request so that
        //         the route handler sees them.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Step 2: create a new NextResponse that forwards the modified request
        //         (this is what passes the refreshed cookies to the handler).
        supabaseResponse = NextResponse.next({ request });
        // Step 3: also set cookies on the outgoing response so the browser
        //         stores the refreshed session.
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Always call getUser() — this triggers session refresh if needed.
  // Do not use getSession() here; getUser() validates with the server.
  let user: any = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (e) {
    console.error("Middleware: getUser() failed:", e);
  }

  // ─── API routes ──────────────────────────────────────────────────────────
  // Just pass through with the refreshed session. API handlers do their own
  // auth check via Bearer token (authedFetch) or the refreshed cookies.
  if (request.nextUrl.pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  // ─── Page routes ─────────────────────────────────────────────────────────

  // Redirect /auth/* to /register (except logout)
  if (
    request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname !== "/auth/logout"
  ) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  if (user) {
    // Fetch profile for role/suspended check (page routes only)
    let profile: { role?: string; suspended?: boolean } | null = null;
    try {
      const { data: p } = await supabase
        .from("profiles")
        .select("role,suspended")
        .eq("id", user.id)
        .single();
      profile = p ?? null;
    } catch (e) {
      console.error("Middleware: profile fetch failed:", e);
    }

    const userIsAdmin = Boolean(
      profile?.role && ["admin", "super_admin"].includes(profile.role!)
    );

    // Block suspended users
    if (
      profile?.suspended &&
      !request.nextUrl.pathname.startsWith("/suspended")
    ) {
      return NextResponse.redirect(new URL("/suspended", request.url));
    }

    // Auto-route admins away from client-only entry points
    if (
      userIsAdmin &&
      (request.nextUrl.pathname === "/" ||
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/register") ||
        request.nextUrl.pathname.startsWith("/mgdashboard"))
    ) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Protect /admin — non-admins get sent to their dashboard
    if (request.nextUrl.pathname.startsWith("/admin") && !userIsAdmin) {
      return NextResponse.redirect(new URL("/mgdashboard", request.url));
    }

    // Authenticated users don't need to see /register
    if (request.nextUrl.pathname.startsWith("/register")) {
      return NextResponse.redirect(
        new URL(userIsAdmin ? "/admin" : "/mgdashboard", request.url)
      );
    }
  } else {
    // Unauthenticated — redirect protected pages to login
    if (
      request.nextUrl.pathname.startsWith("/mgdashboard") ||
      request.nextUrl.pathname.startsWith("/admin")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /**
     * Run on ALL paths except Next.js internals and static assets.
     * /api routes are intentionally included so sessions are refreshed
     * before every API route handler runs.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

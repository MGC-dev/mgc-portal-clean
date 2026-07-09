/**
 * Server-side Supabase clients for Next.js App Router.
 *
 * - createServerSupabaseClient: anon-key client that reads/writes cookies
 * - createAdminSupabaseClient:  service-role client for privileged operations
 * - getUserAndProfile:          resolves the current user + profile (Bearer or cookie)
 * - isAdmin / requireAdmin:     role-check helpers
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Server client (reads/writes session cookies)
// ---------------------------------------------------------------------------
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient(url, anon, {
    cookies: {
      // Use getAll/setAll — @supabase/ssr chunks large JWTs across multiple
      // cookies (sb-xxx-auth-token.0, .1, …). getAll reassembles them.
      getAll() {
        const all = cookieStore.getAll();
        console.log("[cookies] names:", all.map(c => c.name));
        return all;
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components have read-only cookies.
          // Middleware handles the actual session refresh write.
        }
      },
    },
  });
};

// ---------------------------------------------------------------------------
// Admin client (service-role key — bypasses RLS, server-only)
// ---------------------------------------------------------------------------
export const createAdminSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// ---------------------------------------------------------------------------
// getUserAndProfile
//
// Reads from session cookies (refreshed by middleware)
// ---------------------------------------------------------------------------
export async function getUserAndProfile(request?: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .or(`id.eq.${user.id},email.eq.${user.email}`)
    .limit(1)
    .maybeSingle();

  return { user, profile };
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------
export async function isAdmin(request?: Request): Promise<boolean> {
  const { user, profile } = await getUserAndProfile(request);
  if (!user) return false;

  // Primary check: profile.role column
  if (profile?.role && ["admin", "super_admin"].includes(profile.role)) {
    return true;
  }

  // Fallback: role_assignments table
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("role_assignments")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "super_admin"]);

  return Array.isArray(data) && data.length > 0;
}

export async function requireAdmin(request?: Request): Promise<boolean> {
  return (await isAdmin(request)) === true;
}

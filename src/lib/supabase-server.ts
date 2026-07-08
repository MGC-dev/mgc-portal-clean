import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabaseCookieOptions } from "@/lib/supabase-cookies";

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error("Missing Supabase envs: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createServerClient(url, anon, {
    cookies: {
      // Use getAll/setAll — @supabase/ssr chunks large JWTs across multiple
      // cookies (e.g. sb-xxx-auth-token.0, .1 …). A single `get(name)` call
      // cannot reassemble them, causing getUser() to always return null.
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll is called from Server Components where cookies are read-only.
          // Safe to ignore — the middleware will handle refreshing the session.
        }
      },
    },
    cookieOptions: supabaseCookieOptions,
  });
};

// Admin client using service role key for server-side operations only
export const createAdminSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase URL or Service Role key. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Helpers: get current user and profile (server-side)
export async function getUserAndProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

export async function isAdmin() {
  const { user, profile } = await getUserAndProfile();
  if (!user) return false;
  // Prefer profile.role, fallback to role_assignments
  if (profile?.role && ["admin", "super_admin"].includes(profile.role)) {
    return true;
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("role_assignments")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "super_admin"]);
  return Array.isArray(data) && data.length > 0;
}

export async function requireAdmin() {
  return (await isAdmin()) === true;
}

import { createBrowserClient } from "@supabase/ssr";
import { supabaseCookieOptions } from "@/lib/supabase-cookies";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Do NOT set flowType: 'pkce' — PKCE stores a code verifier in
      // localStorage and exchanges it for a session via a redirect, which
      // means cookies are NOT set immediately after signInWithPassword.
      // The default flow writes the session directly into cookies so the
      // server-side middleware and API routes can always read it.
    },
    cookieOptions: supabaseCookieOptions,
    global: {
      headers: {
        'X-Client-Info': 'mgc-cpm-web'
      }
    }
  });
}

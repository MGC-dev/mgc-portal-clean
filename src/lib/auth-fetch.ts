"use client";

import { createClient } from "@/lib/supabase";

/**
 * Gets the current session's access token, retrying up to `maxAttempts` times
 * with a short delay. This handles the brief window after a login redirect
 * where the browser client hasn't yet hydrated the session from cookies.
 */
async function getAccessToken(maxAttempts = 5, delayMs = 200): Promise<string | null> {
  const supabase = createClient();

  for (let i = 0; i < maxAttempts; i++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
    // Session not ready yet — wait briefly and retry
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return null;
}

export async function getAuthHeaders(headers: HeadersInit = {}): Promise<Headers> {
  const nextHeaders = new Headers(headers);
  const token = await getAccessToken();
  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }
  return nextHeaders;
}

export async function authedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: await getAuthHeaders(init.headers),
  });
}

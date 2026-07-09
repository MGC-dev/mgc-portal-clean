"use client";

/**
 * A wrapper around native fetch that ensures cookies are sent with same-origin requests.
 * Since the browser client (`@supabase/ssr`) writes the session to cookies,
 * we no longer need to manually extract and attach a Bearer token.
 */
export async function authedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include", // Ensure cookies are sent
  });
}

"use client";

import { createClient } from "@/lib/supabase";

export async function getAuthHeaders(headers: HeadersInit = {}) {
  const nextHeaders = new Headers(headers);
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    nextHeaders.set("Authorization", `Bearer ${session.access_token}`);
  }

  return nextHeaders;
}

export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: await getAuthHeaders(init.headers),
  });
}

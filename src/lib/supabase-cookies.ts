import type { CookieOptionsWithName } from "@supabase/ssr";

export const supabaseCookieOptions: CookieOptionsWithName = {
  // Do NOT set a custom `name` here.
  // @supabase/ssr chunks large JWTs across multiple cookies named
  // sb-<project-ref>-auth-token.0, .1, etc. Overriding `name` to a fixed
  // string breaks that chunking, causing getUser() to always return null.
  path: "/",
  sameSite: "lax",
  maxAge: 31536000,
};

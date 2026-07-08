import type { CookieOptionsWithName } from "@supabase/ssr";

export const supabaseCookieOptions: CookieOptionsWithName = {
  name: "sb-auth-token",
  path: "/",
  sameSite: "lax",
  maxAge: 31536000,
};

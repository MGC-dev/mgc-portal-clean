/**
 * Pure role predicates — no Supabase or next/headers imports, so this module is
 * safe to pull into edge middleware. Server-side helpers live in access.ts.
 */

export const DEV_ROLES = ["developer", "super_admin"] as const;

export function roleIsDeveloper(role?: string | null): boolean {
  return Boolean(role && (DEV_ROLES as readonly string[]).includes(role));
}

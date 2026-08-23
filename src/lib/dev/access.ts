/**
 * Dev Console access control.
 *
 * Access is strictly role-driven: `developer` (and `super_admin`, which sits
 * above every role) may reach /dev and /api/dev/*. Admins may NOT — the dev
 * console exposes environment and infrastructure detail that the admin portal
 * deliberately does not.
 */

import { createServerSupabaseClient, getUserAndProfile } from "@/lib/supabase-server";
import { DEV_ROLES, roleIsDeveloper } from "@/lib/dev/access-roles";

export { DEV_ROLES, roleIsDeveloper };

/** Current user + profile + whether they hold a dev role. */
export async function getDeveloperContext() {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { user: null, profile: null, isDeveloper: false };

  if (roleIsDeveloper(profile?.role)) {
    return { user, profile, isDeveloper: true };
  }

  // Fallback: additional roles granted via role_assignments
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("role_assignments")
    .select("role")
    .eq("user_id", user.id)
    .in("role", DEV_ROLES as unknown as string[]);

  return { user, profile, isDeveloper: Array.isArray(data) && data.length > 0 };
}

export async function isDeveloper(): Promise<boolean> {
  return (await getDeveloperContext()).isDeveloper;
}

/** Throws-free guard for route handlers: `if (!(await requireDeveloper())) return 401`. */
export async function requireDeveloper(): Promise<boolean> {
  return (await isDeveloper()) === true;
}

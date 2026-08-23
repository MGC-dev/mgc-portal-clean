/**
 * Maintenance mode — privileged read/write.
 *
 * State lives in public.app_settings under the `maintenance` key so it is
 * shared across every serverless instance and survives redeploys. Middleware
 * reads it through maintenance-edge.ts.
 */

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  FALLBACK_MAINTENANCE,
  MAINTENANCE_KEY,
  invalidateMaintenanceCache,
  normaliseMaintenanceRow,
  type MaintenanceState,
} from "@/lib/dev/maintenance-edge";

export type { MaintenanceState };
export { DEFAULT_MAINTENANCE_MESSAGE, MAINTENANCE_KEY };

/** Authoritative read (service role, uncached). */
export async function readMaintenanceState(): Promise<MaintenanceState> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("app_settings")
    .select("value,updated_at,updated_by")
    .eq("key", MAINTENANCE_KEY)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return FALLBACK_MAINTENANCE;
  return normaliseMaintenanceRow(data);
}

export async function writeMaintenanceState(input: {
  enabled: boolean;
  message?: string;
  actorEmail?: string | null;
}): Promise<MaintenanceState> {
  const admin = createAdminSupabaseClient();
  const message =
    typeof input.message === "string" && input.message.trim()
      ? input.message.trim()
      : DEFAULT_MAINTENANCE_MESSAGE;

  const { data, error } = await admin
    .from("app_settings")
    .upsert(
      {
        key: MAINTENANCE_KEY,
        value: { enabled: input.enabled, message },
        updated_at: new Date().toISOString(),
        updated_by: input.actorEmail ?? null,
      },
      { onConflict: "key" }
    )
    .select("value,updated_at,updated_by")
    .single();

  if (error) throw new Error(error.message);
  invalidateMaintenanceCache(); // this instance reflects the change immediately
  return normaliseMaintenanceRow(data);
}

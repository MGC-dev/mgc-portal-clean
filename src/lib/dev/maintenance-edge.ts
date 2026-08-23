/**
 * Maintenance-mode state shared between edge middleware and server code.
 *
 * Nothing here imports next/headers or the service-role client, so it can be
 * bundled into middleware. Privileged read/write lives in maintenance.ts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const MAINTENANCE_KEY = "maintenance";
export const MAINTENANCE_CACHE_MS = 10_000;

export const DEFAULT_MAINTENANCE_MESSAGE =
  "We are performing scheduled maintenance. We will be back shortly.";

export type MaintenanceState = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const FALLBACK_MAINTENANCE: MaintenanceState = {
  enabled: false,
  message: DEFAULT_MAINTENANCE_MESSAGE,
  updatedAt: null,
  updatedBy: null,
};

export function normaliseMaintenanceRow(row: any): MaintenanceState {
  const value = row?.value ?? {};
  return {
    enabled: Boolean(value.enabled),
    message:
      typeof value.message === "string" && value.message.trim()
        ? value.message
        : DEFAULT_MAINTENANCE_MESSAGE,
    updatedAt: row?.updated_at ?? null,
    updatedBy: row?.updated_by ?? null,
  };
}

// Per-instance cache so we do not add a DB round-trip to every page view. A
// toggle therefore reaches every warm instance within MAINTENANCE_CACHE_MS.
let edgeCache: { at: number; state: MaintenanceState } | null = null;
let lastLoggedError: string | null = null;
let lastLoggedAt = 0;

export function invalidateMaintenanceCache() {
  edgeCache = null;
}

/**
 * Cached anon read used by middleware. Never throws: if the settings row cannot
 * be reached we fail OPEN (site stays up) rather than locking everyone out.
 */
export async function readMaintenanceForEdge(
  supabase: SupabaseClient
): Promise<MaintenanceState> {
  const now = Date.now();
  if (edgeCache && now - edgeCache.at < MAINTENANCE_CACHE_MS) {
    return edgeCache.state;
  }

  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value,updated_at,updated_by")
      .eq("key", MAINTENANCE_KEY)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const state = data ? normaliseMaintenanceRow(data) : FALLBACK_MAINTENANCE;
    edgeCache = { at: now, state };
    return state;
  } catch (e) {
    // Throttled: a missing/unreachable settings row would otherwise log on
    // every cache miss, once per request wave, forever.
    const message = `${(e as any)?.message || e}`;
    if (message !== lastLoggedError || now - lastLoggedAt > 60_000) {
      console.error("[maintenance] edge read failed, failing open:", message);
      lastLoggedError = message;
      lastLoggedAt = now;
    }
    const state = edgeCache?.state ?? FALLBACK_MAINTENANCE;
    edgeCache = { at: now, state };
    return state;
  }
}

/**
 * Dev event log — audit trail and error log behind /dev/logs.
 *
 * Writes use the service-role client so they never depend on the caller's RLS
 * context, and they never throw: logging must not break the calling request.
 */

import { createAdminSupabaseClient } from "@/lib/supabase-server";

export type DevEventLevel = "info" | "warn" | "error";

export type DevEvent = {
  id: string;
  level: DevEventLevel;
  source: string;
  message: string;
  meta: Record<string, unknown>;
  actor_email: string | null;
  created_at: string;
};

export async function logDevEvent(input: {
  level?: DevEventLevel;
  source: string;
  message: string;
  meta?: Record<string, unknown>;
  actorEmail?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    await admin.from("dev_events").insert({
      level: input.level ?? "info",
      source: input.source,
      message: input.message,
      meta: input.meta ?? {},
      actor_email: input.actorEmail ?? null,
    });
  } catch (e) {
    // Never let logging failures surface to the caller.
    console.error("[dev/events] failed to record event:", e);
  }
}

export async function listDevEvents(opts: {
  limit?: number;
  level?: DevEventLevel | "all";
  source?: string;
} = {}): Promise<DevEvent[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("dev_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(opts.limit ?? 100, 500));

  if (opts.level && opts.level !== "all") query = query.eq("level", opts.level);
  if (opts.source) query = query.eq("source", opts.source);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DevEvent[];
}

/**
 * Live health checks — the "tests" that actually mean something in production.
 *
 * Every check is a real round-trip against the dependency it names, run in
 * parallel behind a timeout, and reports latency. A check whose credentials are
 * absent reports `skipped` rather than `fail`, so an unconfigured integration
 * is never mistaken for a broken one.
 *
 * Checks are read-only: no writes, no emails sent, no billable model calls.
 */

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getBiginAccessToken, getWorkDriveAccessToken } from "@/lib/zoho-workdrive";
import { getZohoAccessToken } from "@/lib/zoho";

export type CheckStatus = "ok" | "fail" | "skipped";

export type HealthCheck = {
  id: string;
  label: string;
  group: string;
  status: CheckStatus;
  ms: number;
  detail: string;
};

const DEFAULT_TIMEOUT_MS = 8000;

class SkipCheck extends Error {}

function skip(reason: string): never {
  throw new SkipCheck(reason);
}

function requireEnv(...names: string[]): void {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) skip(`Not configured — missing ${missing.join(", ")}`);
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function runCheck(
  id: string,
  label: string,
  group: string,
  fn: () => Promise<string>
): Promise<HealthCheck> {
  const started = Date.now();
  try {
    const detail = await withTimeout(fn(), DEFAULT_TIMEOUT_MS, label);
    return { id, label, group, status: "ok", ms: Date.now() - started, detail };
  } catch (e: any) {
    const message = `${e?.message || e}`;
    const status: CheckStatus = e instanceof SkipCheck ? "skipped" : "fail";
    return { id, label, group, status, ms: Date.now() - started, detail: message };
  }
}

/** A timed fetch that never throws on non-2xx — the caller decides. */
async function probe(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS - 500);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

// ───────────────────────────────────────────────────────────────────────────

export async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks = await Promise.all([
    // ─── Database & auth ───────────────────────────────────────────────────
    runCheck("supabase-db", "Supabase — database", "Supabase", async () => {
      requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
      const admin = createAdminSupabaseClient();
      const { count, error } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return `Query succeeded — ${count ?? 0} profiles`;
    }),

    runCheck("supabase-auth", "Supabase — auth endpoint", "Supabase", async () => {
      requireEnv("NEXT_PUBLIC_SUPABASE_URL");
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
      const res = await probe(`${base}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({ email: "healthcheck@example.invalid", password: "x" }),
      });
      // Invalid credentials are expected — any structured reply proves reachability.
      if (res.ok || [400, 401, 403].includes(res.status)) {
        return `Reachable (HTTP ${res.status} to invalid credentials, as expected)`;
      }
      throw new Error(`Unexpected HTTP ${res.status}`);
    }),

    runCheck("supabase-storage", "Supabase — storage buckets", "Supabase", async () => {
      requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
      const admin = createAdminSupabaseClient();
      const { data, error } = await admin.storage.listBuckets();
      if (error) throw new Error(error.message);
      const found = new Set((data ?? []).map((b) => b.name));
      const expected = [
        process.env.SUPABASE_RESOURCES_BUCKET,
        process.env.SUPABASE_CONTRACTS_BUCKET,
        process.env.SUPABASE_SIGNED_CONTRACTS_BUCKET,
        process.env.SUPABASE_CLIENT_DOCS_BUCKET,
      ].filter(Boolean) as string[];
      const missing = expected.filter((b) => !found.has(b));
      if (missing.length) throw new Error(`Missing bucket(s): ${missing.join(", ")}`);
      return `${found.size} bucket(s); all ${expected.length} configured bucket(s) present`;
    }),

    runCheck("app-settings", "App settings table", "Supabase", async () => {
      requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
      const admin = createAdminSupabaseClient();
      const { error } = await admin.from("app_settings").select("key").limit(1);
      if (error) {
        throw new Error(
          `${error.message} — run supabase-dev-dashboard.sql in the Supabase SQL editor`
        );
      }
      return "app_settings reachable (maintenance mode is backed)";
    }),

    // ─── Zoho ──────────────────────────────────────────────────────────────
    runCheck("zoho-bigin", "Zoho Bigin — OAuth token", "Zoho", async () => {
      requireEnv(
        "ZOHO_BIGIN_CLIENT_ID",
        "ZOHO_BIGIN_CLIENT_SECRET",
        "ZOHO_BIGIN_REFRESH_TOKEN"
      );
      const token = await getBiginAccessToken();
      return `Access token issued (${token.length} chars)`;
    }),

    runCheck("zoho-workdrive", "Zoho WorkDrive — OAuth token", "Zoho", async () => {
      requireEnv(
        "ZOHO_WORKDRIVE_CLIENT_ID",
        "ZOHO_WORKDRIVE_CLIENT_SECRET",
        "ZOHO_WORKDRIVE_REFRESH_TOKEN"
      );
      const token = await getWorkDriveAccessToken();
      return `Access token issued (${token.length} chars)`;
    }),

    runCheck("zoho-sign", "Zoho Sign — OAuth token", "Zoho", async () => {
      requireEnv("ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN");
      const token = await getZohoAccessToken();
      return `Access token issued (${token.length} chars)`;
    }),

    // ─── Email / AI / meetings ─────────────────────────────────────────────
    runCheck("resend", "Resend — API key", "Email & AI", async () => {
      requireEnv("RESEND_API_KEY");
      const res = await probe("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      if (res.status === 401 || res.status === 403) throw new Error("API key rejected (401/403)");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json().catch(() => ({}));
      const domains = json?.data?.length ?? 0;
      return `Key valid — ${domains} sending domain(s)`;
    }),

    runCheck("fireflies", "Fireflies — GraphQL API", "Email & AI", async () => {
      requireEnv("FIREFLIES_API_KEY");
      const res = await probe("https://api.fireflies.ai/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FIREFLIES_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "{ user { user_id email } }" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json().catch(() => ({}));
      if (json?.errors?.length) {
        throw new Error(json.errors[0]?.message || "GraphQL error");
      }
      return `Authenticated as ${json?.data?.user?.email ?? "unknown user"}`;
    }),

    runCheck("anthropic", "Anthropic — API key", "Email & AI", async () => {
      requireEnv("ANTHROPIC_API_KEY");
      // Model listing is free — no tokens are billed by this check.
      const res = await probe("https://api.anthropic.com/v1/models?limit=1", {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
      });
      if (res.status === 401 || res.status === 403) throw new Error("API key rejected (401/403)");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return "Key valid";
    }),
  ]);

  return checks;
}

export function summariseChecks(checks: HealthCheck[]) {
  return {
    total: checks.length,
    ok: checks.filter((c) => c.status === "ok").length,
    failed: checks.filter((c) => c.status === "fail").length,
    skipped: checks.filter((c) => c.status === "skipped").length,
    slowestMs: checks.reduce((m, c) => Math.max(m, c.ms), 0),
  };
}

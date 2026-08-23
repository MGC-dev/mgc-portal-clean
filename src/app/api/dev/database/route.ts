/**
 * GET /api/dev/database — row counts per table and storage bucket sizes.
 * Developer-only. Uses HEAD/exact counts, so it never pulls row data.
 */

import { NextResponse } from "next/server";
import { getDeveloperContext } from "@/lib/dev/access";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Mirrors the tables created by supabase-schema.sql + supabase-dev-dashboard.sql
const TABLES = [
  "profiles",
  "role_assignments",
  "companies",
  "appointments",
  "invoices",
  "payments",
  "support_tickets",
  "messages",
  "email_otps",
  "subscription_tiers",
  "user_subscriptions",
  "service_components",
  "service_component_access",
  "contracts",
  "session_recaps",
  "resources",
  "client_documents",
  "app_settings",
  "dev_events",
];

export async function GET() {
  const { isDeveloper } = await getDeveloperContext();
  if (!isDeveloper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch (e: any) {
    return NextResponse.json({ error: `${e?.message || e}` }, { status: 500 });
  }

  const tables = await Promise.all(
    TABLES.map(async (name) => {
      try {
        const { count, error } = await admin
          .from(name)
          .select("*", { count: "exact", head: true });
        if (error) return { name, rows: null, error: error.message };
        return { name, rows: count ?? 0, error: null };
      } catch (e: any) {
        return { name, rows: null, error: `${e?.message || e}` };
      }
    })
  );

  let buckets: { name: string; public: boolean; createdAt: string | null }[] = [];
  let bucketError: string | null = null;
  try {
    const { data, error } = await admin.storage.listBuckets();
    if (error) bucketError = error.message;
    buckets = (data ?? []).map((b: any) => ({
      name: b.name,
      public: Boolean(b.public),
      createdAt: b.created_at ?? null,
    }));
  } catch (e: any) {
    bucketError = `${e?.message || e}`;
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    tables,
    buckets,
    bucketError,
    summary: {
      tables: tables.length,
      missing: tables.filter((t) => t.error).length,
      totalRows: tables.reduce((n, t) => n + (t.rows ?? 0), 0),
    },
  });
}

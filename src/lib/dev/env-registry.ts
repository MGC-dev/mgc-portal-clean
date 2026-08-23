/**
 * Environment variable inspector.
 *
 * SECRET VALUES ARE NEVER RETURNED. For non-public variables the console shows
 * only: whether it is set, its length, and a short SHA-256 fingerprint — enough
 * to confirm *which* key is deployed (compare fingerprints between environments)
 * without exposing the key itself. NEXT_PUBLIC_* values are shown in full
 * because they ship to every browser already.
 */

import { createHash } from "node:crypto";

export type EnvGroup =
  | "Supabase"
  | "Zoho"
  | "Email"
  | "Meetings & AI"
  | "Platform";

export type EnvVarSpec = {
  name: string;
  group: EnvGroup;
  required: boolean;
  description: string;
};

export const ENV_REGISTRY: EnvVarSpec[] = [
  // Supabase
  { name: "NEXT_PUBLIC_SUPABASE_URL", group: "Supabase", required: true, description: "Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", group: "Supabase", required: true, description: "Anon key used by browser + middleware" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", group: "Supabase", required: true, description: "Service-role key (bypasses RLS, server only)" },
  { name: "SUPABASE_CLIENT_DOCS_BUCKET", group: "Supabase", required: false, description: "Storage bucket for client uploads" },
  { name: "SUPABASE_CONTRACTS_BUCKET", group: "Supabase", required: false, description: "Storage bucket for unsigned contracts" },
  { name: "SUPABASE_SIGNED_CONTRACTS_BUCKET", group: "Supabase", required: false, description: "Storage bucket for signed contracts" },
  { name: "SUPABASE_RESOURCES_BUCKET", group: "Supabase", required: false, description: "Storage bucket for the resource library" },

  // Zoho
  { name: "ZOHO_REGION", group: "Zoho", required: false, description: "Zoho data-centre suffix (com, eu, in…). Defaults to com" },
  { name: "ZOHO_CLIENT_ID", group: "Zoho", required: false, description: "Zoho Sign OAuth client id" },
  { name: "ZOHO_CLIENT_SECRET", group: "Zoho", required: false, description: "Zoho Sign OAuth client secret" },
  { name: "ZOHO_REFRESH_TOKEN", group: "Zoho", required: false, description: "Zoho Sign refresh token" },
  { name: "ZOHO_BIGIN_CLIENT_ID", group: "Zoho", required: true, description: "Bigin/CRM OAuth client id" },
  { name: "ZOHO_BIGIN_CLIENT_SECRET", group: "Zoho", required: true, description: "Bigin/CRM OAuth client secret" },
  { name: "ZOHO_BIGIN_REFRESH_TOKEN", group: "Zoho", required: true, description: "Bigin/CRM refresh token" },
  { name: "ZOHO_WORKDRIVE_CLIENT_ID", group: "Zoho", required: true, description: "WorkDrive OAuth client id" },
  { name: "ZOHO_WORKDRIVE_CLIENT_SECRET", group: "Zoho", required: true, description: "WorkDrive OAuth client secret" },
  { name: "ZOHO_WORKDRIVE_REFRESH_TOKEN", group: "Zoho", required: true, description: "WorkDrive refresh token" },
  { name: "NEXT_PUBLIC_WORKDRIVE_CLIENT_DOCUMENTS_FOLDER_ID", group: "Zoho", required: false, description: "Root WorkDrive folder for client documents" },

  // Email
  { name: "RESEND_API_KEY", group: "Email", required: true, description: "Resend transactional email key" },
  { name: "RESEND_FROM_EMAIL", group: "Email", required: true, description: "Verified from-address for outbound mail" },

  // Meetings & AI
  { name: "FIREFLIES_API_KEY", group: "Meetings & AI", required: false, description: "Fireflies GraphQL API key" },
  { name: "FIREFLIES_WEBHOOK_SECRET", group: "Meetings & AI", required: false, description: "HMAC secret for Fireflies webhooks" },
  { name: "ANTHROPIC_API_KEY", group: "Meetings & AI", required: false, description: "Claude API key for meeting summaries" },

  // Platform (set by the host, not by you)
  { name: "NODE_ENV", group: "Platform", required: false, description: "Node environment" },
  { name: "VERCEL_ENV", group: "Platform", required: false, description: "Vercel deployment environment" },
  { name: "VERCEL_REGION", group: "Platform", required: false, description: "Serverless region serving this request" },
  { name: "VERCEL_GIT_COMMIT_SHA", group: "Platform", required: false, description: "Commit SHA of the running deployment" },
];

export type EnvVarReport = EnvVarSpec & {
  set: boolean;
  isPublic: boolean;
  length: number | null;
  fingerprint: string | null;
  value: string | null; // only ever populated for NEXT_PUBLIC_* / NODE_ENV-style vars
};

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

const SAFE_TO_SHOW = new Set(["NODE_ENV", "VERCEL_ENV", "VERCEL_REGION", "ZOHO_REGION"]);

export function inspectEnv(): EnvVarReport[] {
  return ENV_REGISTRY.map((spec) => {
    const raw = process.env[spec.name];
    const set = typeof raw === "string" && raw.length > 0;
    const isPublic = spec.name.startsWith("NEXT_PUBLIC_") || SAFE_TO_SHOW.has(spec.name);

    return {
      ...spec,
      set,
      isPublic,
      length: set ? raw!.length : null,
      fingerprint: set ? fingerprint(raw!) : null,
      value: set && isPublic ? raw! : null,
    };
  });
}

export function summariseEnv(report: EnvVarReport[]) {
  const missingRequired = report.filter((r) => r.required && !r.set);
  return {
    total: report.length,
    set: report.filter((r) => r.set).length,
    missingRequired: missingRequired.length,
    missingRequiredNames: missingRequired.map((r) => r.name),
  };
}

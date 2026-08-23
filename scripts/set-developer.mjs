#!/usr/bin/env node
/**
 * Grant (or revoke) access to the dev console at /dev.
 *
 *   node scripts/set-developer.mjs <email>                # role -> developer
 *   node scripts/set-developer.mjs <email> --super-admin  # role -> super_admin
 *   node scripts/set-developer.mjs <email> --revoke       # role -> client
 *
 * `developer` reaches /dev only. `super_admin` reaches BOTH /dev and /admin —
 * use it when the same person has to keep running the admin portal.
 *
 * Requires supabase-dev-dashboard.sql to have been applied first: the profiles
 * role check constraint rejects 'developer' until then.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const [email, ...flags] = process.argv.slice(2);
const revoke = flags.includes("--revoke");
const superAdmin = flags.includes("--super-admin");

if (!email || (revoke && superAdmin)) {
  console.error(
    "Usage: node scripts/set-developer.mjs <email> [--super-admin | --revoke]"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const role = revoke ? "client" : superAdmin ? "super_admin" : "developer";

const { data, error } = await supabase
  .from("profiles")
  .update({ role })
  .eq("email", email)
  .select("id,email,role");

if (error) {
  console.error(`Failed to set role: ${error.message}`);
  if (/profiles_role_check/.test(error.message)) {
    console.error("→ Run supabase-dev-dashboard.sql in the Supabase SQL editor first.");
  }
  process.exit(1);
}

if (!data?.length) {
  console.error(`No profile found for ${email}. Has the user registered?`);
  process.exit(1);
}

console.log(`${data[0].email} is now: ${data[0].role}`);
if (superAdmin) {
  console.log("They can open /dev and keep full access to /admin.");
} else if (!revoke) {
  console.log("They can now sign in and open /dev. Note: this is NOT an admin role.");
}

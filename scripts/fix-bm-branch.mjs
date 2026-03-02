/**
 * Fix BM user's branch — ensure bm@hertz.demo has branch = "Santa Monica".
 * Run after CSV upload if BM view shows 0 leads.
 *
 * Run: node scripts/fix-bm-branch.mjs
 * Requires: SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL in .env
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(join(__dirname, "..", ".env"), "utf8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
} catch {}

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const BM_EMAIL = "bm@hertz.demo";
const BM_BRANCH = "Santa Monica";

async function fix() {
  console.log("1. Looking for BM user:", BM_EMAIL);
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = list?.users?.find((u) => u.email?.toLowerCase() === BM_EMAIL.toLowerCase());

  if (!found) {
    console.error("   BM user not found. Run: npm run seed:users");
    process.exit(1);
  }

  console.log("   Found. User ID:", found.id);
  console.log("2. Updating user_profiles.branch to", BM_BRANCH);

  const { error } = await supabase
    .from("user_profiles")
    .update({ branch: BM_BRANCH, updated_at: new Date().toISOString() })
    .eq("id", found.id);

  if (error) {
    console.error("   FAILED:", error.message);
    process.exit(1);
  }

  console.log("   OK");
  console.log("\nDone. BM user (Sarah Chen) now has branch:", BM_BRANCH);
  console.log("Log out and log back in, or refresh the page to see BM view data.");
}

fix().catch((e) => {
  console.error(e);
  process.exit(1);
});

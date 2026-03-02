/**
 * Fix Vikram's user and profile — ensure he can log in and sees GM view.
 * Run: node scripts/fix-vikram-user.mjs
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

const VIKRAM = {
  email: "Vikram.Rajagopalan@hertz.com",
  password: "demo123",
  role: "gm",
  display_name: "Vikram Rajagopalan",
  branch: null,
  avatar_url: "/avatars/vikram-rajagopalan.png",
};

async function fix() {
  const email = VIKRAM.email;
  const emailLower = email.toLowerCase();

  console.log("1. Looking for user:", email);
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = list?.users?.find((u) => u.email?.toLowerCase() === emailLower);

  let userId;
  if (found) {
    userId = found.id;
    console.log("   Found. User ID:", userId);
    console.log("2. Updating password and confirming email...");
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: VIKRAM.password,
      email_confirm: true,
    });
    if (updateErr) console.warn("   Password/confirm update warning:", updateErr.message);
    else console.log("   OK");
  } else {
    console.log("   Not found. Creating user...");
    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
      email: VIKRAM.email,
      password: VIKRAM.password,
      email_confirm: true,
    });
    if (createErr) {
      console.error("   FAILED:", createErr.message);
      process.exit(1);
    }
    userId = createData.user.id;
    console.log("   Created. User ID:", userId);
  }

  console.log("3. Upserting user_profiles (role=gm)...");
  const baseRow = {
    id: userId,
    role: VIKRAM.role,
    display_name: VIKRAM.display_name,
    branch: VIKRAM.branch,
    updated_at: new Date().toISOString(),
  };
  let row = { ...baseRow, avatar_url: VIKRAM.avatar_url };
  let { error: profileErr } = await supabase.from("user_profiles").upsert(row, { onConflict: "id" });
  if (profileErr && profileErr.message?.includes("avatar_url")) {
    console.log("   avatar_url column missing, retrying without it...");
    row = baseRow;
    const res = await supabase.from("user_profiles").upsert(row, { onConflict: "id" });
    profileErr = res.error;
  }
  if (profileErr) {
    console.error("   FAILED:", profileErr.message);
    process.exit(1);
  }
  console.log("   OK");

  console.log("\nDone. Vikram can now log in with:");
  console.log("  Email:", VIKRAM.email);
  console.log("  Password:", VIKRAM.password);
  console.log("  Role: GM (General Manager view)");
}

fix().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Seed demo users for Hertz LMS (bm, gm, admin, Vikram).
 * Requires: SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL in .env
 * Run: npm run seed:users
 *
 * Prerequisites:
 * 1. Run 003_user_profiles.sql in Supabase SQL Editor first.
 * 2. For profile photos, run 023_user_profiles_avatar_url.sql before seeding.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env from project root (no external deps)
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
  const missing = [];
  if (!url) missing.push("VITE_SUPABASE_URL");
  if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  console.error("Missing in .env:", missing.join(", "));
  console.error("Get the service role key from: Supabase Dashboard → Project Settings → API → service_role");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_USERS = [
  { email: "bm@hertz.demo", password: "demo123", role: "bm", display_name: "Sarah Chen", branch: "Santa Monica" },
  { email: "gm@hertz.demo", password: "demo123", role: "gm", display_name: "Mike Torres", branch: null },
  { email: "admin@hertz.demo", password: "demo123", role: "admin", display_name: "Lisa Park", branch: null },
  { email: "Vikram.Rajagopalan@hertz.com", password: "demo123", role: "gm", display_name: "Vikram Rajagopalan", branch: null, avatar_url: "/avatars/vikram-rajagopalan.png" },
  { email: "gil.west@hertz.com", password: "demo123", role: "gm", display_name: "Gil West", branch: null, avatar_url: "/avatars/gil-west.png", title: "Chief Executive Officer" },
  { email: "mike.moore@hertz.com", password: "demo123", role: "gm", display_name: "Mike Moore", branch: null, avatar_url: "/avatars/mike-moore.png", title: "Chief Operating Officer" },
];

async function seed() {
  for (const u of DEMO_USERS) {
    try {
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });

      if (createError) {
        if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
          console.log(`  ${u.email} — already exists, resetting password & upserting profile`);
          const { data: list } = await supabase.auth.admin.listUsers();
          const found = list?.users?.find((x) => x.email === u.email);
          if (found) {
            await supabase.auth.admin.updateUserById(found.id, { password: u.password });
            await upsertProfile(found.id, u.role, u.display_name, u.branch, u.avatar_url, u.title);
          }
          continue;
        }
        throw createError;
      }

      await upsertProfile(data.user.id, u.role, u.display_name, u.branch, u.avatar_url, u.title);
      console.log(`  ${u.email} — created (${u.role})`);
    } catch (err) {
      console.error(`  ${u.email} — failed:`, err.message);
    }
  }
  console.log("Done.");
}

async function upsertProfile(userId, role, displayName, branch = null, avatarUrl = null, title = null) {
  const row = { id: userId, role, display_name: displayName, updated_at: new Date().toISOString() };
  if (branch !== undefined) row.branch = branch;
  if (avatarUrl !== undefined) row.avatar_url = avatarUrl;
  if (title !== undefined) row.title = title;
  const { error } = await supabase.from("user_profiles").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Sets a new password for any account (admin or student) by mobile number — e.g. a forgotten admin password.
// Run it yourself in a terminal; it asks for the mobile number and the new password.
// Usage: npm run set-password
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { MIN_PASSWORD } from "../src/lib/admin/accounts";
import { normalizeMobile } from "../src/lib/mobile";
import { requireEnv } from "./lib/env";

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const mobile = normalizeMobile(await rl.question("Mobile (01XXXXXXXXX): "));
  if (!mobile) throw new Error("Mobile number is not valid.");
  const password = await rl.question(`New password (${MIN_PASSWORD}+ characters): `);
  rl.close();
  if (password.length < MIN_PASSWORD) throw new Error(`Password must be at least ${MIN_PASSWORD} characters.`);

  const db = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const { data: profile, error } = await db
    .from("profiles")
    .select("id, student_code, full_name, role")
    .eq("mobile", mobile)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) throw new Error(`No account with mobile ${mobile}.`);
  const { error: uErr } = await db.auth.admin.updateUserById(profile.id, { password });
  if (uErr) throw new Error(uErr.message);
  console.log(`Password changed for ${profile.student_code} ${profile.full_name} (${profile.role}).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

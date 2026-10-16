// Creates an admin account (Arif). Run it yourself in a terminal; it asks for name, mobile and password.
// Usage: npm run create-admin
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { createAccount } from "../src/lib/admin/accounts";
import { requireEnv } from "./lib/env";

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const full_name = (await rl.question("Full name: ")).trim();
  const mobile = (await rl.question("Mobile (01XXXXXXXXX): ")).trim();
  const email = (await rl.question("Email (optional): ")).trim();
  const password = await rl.question("Password (8+ characters): ");
  rl.close();

  const db = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const r = await createAccount(db, { full_name, mobile, email, password, role: "admin" });
  console.log(`Admin created (${r.student_code}). Log in at /login with this mobile number and password.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

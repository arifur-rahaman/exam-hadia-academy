// Account creation shared by the admin panel and scripts/create-admin.ts. Takes a service-role client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { mobileToAuthEmail, normalizeMobile } from "@/lib/mobile";
import type { Role } from "@/lib/types";

export type NewAccount = { full_name: string; mobile: string; email?: string; password: string; role?: Role };

export const MIN_PASSWORD = 8;

export function validateAccount(s: NewAccount): string | null {
  if (!s.full_name?.trim()) return "নাম দিন";
  if (!normalizeMobile(s.mobile ?? "")) return `মোবাইল নম্বর ঠিক নেই: ${s.mobile}`;
  if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) return `Email ঠিক নেই: ${s.email}`;
  if ((s.password ?? "").length < MIN_PASSWORD) return `Password কমপক্ষে ${MIN_PASSWORD} অক্ষর হতে হবে`;
  return null;
}

// Creates the Supabase Auth user (pre-confirmed, synthetic email) and the profile row.
export async function createAccount(db: SupabaseClient, s: NewAccount): Promise<{ id: string; student_code: string }> {
  const problem = validateAccount(s);
  if (problem) throw new Error(problem);
  const mobile = normalizeMobile(s.mobile)!;

  const { data: existing } = await db.from("profiles").select("id").eq("mobile", mobile).maybeSingle();
  if (existing) throw new Error(`এই মোবাইল নম্বরে আগেই Account আছে: ${mobile}`);

  const { data, error } = await db.auth.admin.createUser({
    email: mobileToAuthEmail(mobile),
    password: s.password,
    email_confirm: true,
    user_metadata: { full_name: s.full_name.trim(), mobile },
  });
  if (error || !data.user) throw new Error(`Account তৈরি হয়নি: ${error?.message}`);

  const { data: profile, error: pErr } = await db
    .from("profiles")
    .insert({
      id: data.user.id,
      full_name: s.full_name.trim(),
      mobile,
      email: s.email?.trim() || null,
      role: s.role ?? "student",
    })
    .select("id, student_code")
    .single();
  if (pErr || !profile) {
    await db.auth.admin.deleteUser(data.user.id);
    throw new Error(`Profile তৈরি হয়নি: ${pErr?.message}`);
  }
  return profile as { id: string; student_code: string };
}

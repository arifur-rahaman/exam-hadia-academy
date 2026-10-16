"use server";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { mobileToAuthEmail, normalizeMobile } from "@/lib/mobile";
import { adminDb } from "@/lib/supabase/admin";
import { authClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type LoginState = { error?: string; mobile?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const rawMobile = String(form.get("mobile") ?? "");
  const password = String(form.get("password") ?? "");
  const mobile = normalizeMobile(rawMobile);
  if (!mobile) return { error: "সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)।", mobile: rawMobile };
  if (!password) return { error: "Password দিন।", mobile: rawMobile };

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: mobileToAuthEmail(mobile),
    password,
  });
  if (error || !data.user) {
    return { error: "মোবাইল নম্বর বা Password মেলেনি।", mobile: rawMobile };
  }

  const db = adminDb();
  const { data: profile } = await db.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  const p = profile as Profile | null;
  if (!p || p.status !== "active") {
    await supabase.auth.signOut();
    return { error: "এই Account বন্ধ আছে। Hadia Academy-র সাথে যোগাযোগ করুন।", mobile: rawMobile };
  }
  await db.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", p.id);
  redirect(isAdmin(p) ? "/admin" : "/dashboard");
}

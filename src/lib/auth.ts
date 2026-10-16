import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminDb } from "@/lib/supabase/admin";
import { authClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Current signed-in user's profile, or null. Deduped per request.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await adminDb().from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  return (profile as Profile | null) ?? null;
});

export function isAdmin(p: Profile) {
  return p.role === "admin" || p.role === "super_admin";
}

export async function requireUser(): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect("/login");
  if (p.status !== "active") redirect("/logout?reason=disabled");
  return p;
}

export async function requireStudent(): Promise<Profile> {
  const p = await requireUser();
  if (isAdmin(p)) redirect("/admin");
  return p;
}

export async function requireAdmin(): Promise<Profile> {
  const p = await requireUser();
  if (!isAdmin(p)) redirect("/dashboard");
  return p;
}

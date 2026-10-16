import "server-only";
import { adminDb } from "@/lib/supabase/admin";
import type { Attempt, Profile } from "@/lib/types";

export type AttemptRow = Attempt & {
  student: Pick<Profile, "full_name" | "student_code" | "mobile" | "email">;
  violations: number;
};

// Latest attempts with student info and tab-switch/copy counts.
export async function listAttempts(limit = 1000): Promise<AttemptRow[]> {
  const db = adminDb();
  const { data, error } = await db
    .from("attempts")
    .select("*, student:profiles(full_name, student_code, mobile, email)")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as AttemptRow[];
  const ids = rows.map((r) => r.id);
  const counts = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: v } = await db.from("violations").select("attempt_id").in("attempt_id", ids.slice(i, i + 200));
    (v ?? []).forEach((x) => counts.set(x.attempt_id, (counts.get(x.attempt_id) ?? 0) + 1));
  }
  return rows.map((r) => ({ ...r, violations: counts.get(r.id) ?? 0 }));
}

export function integrityTone(n: number): "success" | "warning" | "danger" {
  return n === 0 ? "success" : n <= 3 ? "warning" : "danger";
}

// Upserts parsed questions by ID; questions missing from the sheet become active = false (never deleted).
// Keeps reviewed CBLM pages untouched. Takes a service-role client.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedQuestion } from "./parse";

export async function syncQuestions(db: SupabaseClient, courseCode: string, qs: ParsedQuestion[]) {
  const { data: course, error: cErr } = await db.from("courses").select("id").eq("code", courseCode).single();
  if (cErr || !course) throw new Error(`Course ${courseCode} not found: ${cErr?.message}`);

  const now = new Date().toISOString();
  const rows = qs.map((q) => ({ ...q, course_id: course.id, active: true, updated_at: now }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("questions").upsert(rows.slice(i, i + 200), { onConflict: "id" });
    if (error) throw new Error(`Upsert failed: ${error.message}`);
  }

  const { data: existing, error: eErr } = await db
    .from("questions")
    .select("id")
    .eq("course_id", course.id)
    .eq("active", true);
  if (eErr) throw new Error(eErr.message);
  const keep = new Set(qs.map((q) => q.id));
  const gone = (existing ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
  for (let i = 0; i < gone.length; i += 200) {
    const { error } = await db
      .from("questions")
      .update({ active: false, updated_at: now })
      .in("id", gone.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }
  return { upserted: rows.length, deactivated: gone.length };
}

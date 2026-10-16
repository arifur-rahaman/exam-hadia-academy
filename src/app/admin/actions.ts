"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { parseCsv } from "@/lib/admin/csv";
import { createStudent, setPassword } from "@/lib/admin/students";
import { getAssessment } from "@/lib/exam/engine";
import { COURSE_CODE } from "@/lib/exam/config";
import { parseQuestionBank, reportMarkdown, summarize } from "@/lib/questions/parse";
import { syncQuestions } from "@/lib/questions/sync";
import { adminDb } from "@/lib/supabase/admin";

export type FormState = { ok?: string; error?: string; details?: string[] };

export async function addStudent(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const r = await createStudent({
      full_name: String(form.get("full_name") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    revalidatePath("/admin");
    return { ok: `Student যোগ হয়েছে: ${r.student_code}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function uploadStudentsCsv(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "CSV ফাইল বেছে নিন।" };
  const rows = parseCsv(await file.text());
  if (!rows.length) return { error: "CSV খালি।" };
  if (!("name" in rows[0] && "mobile" in rows[0] && "password" in rows[0])) {
    return { error: "CSV-এর প্রথম লাইনে লাগবে: name,mobile,email,password" };
  }
  const details: string[] = [];
  let added = 0;
  for (const [i, r] of rows.entries()) {
    try {
      const s = await createStudent({ full_name: r.name, mobile: r.mobile, email: r.email, password: r.password });
      added++;
      details.push(`লাইন ${i + 2}: ✓ ${s.student_code} ${r.name}`);
    } catch (e) {
      details.push(`লাইন ${i + 2}: ✗ ${r.name || "(নাম নেই)"} — ${(e as Error).message}`);
    }
  }
  revalidatePath("/admin");
  return { ok: `${added}/${rows.length} জন যোগ হয়েছে।`, details };
}

async function changeExtra(studentId: string, compute: (used: number, extra: number, max: number) => number) {
  const a = await getAssessment();
  const db = adminDb();
  const [{ data: setting }, { count }] = await Promise.all([
    db
      .from("student_assessment_settings")
      .select("extra_attempts")
      .eq("student_id", studentId)
      .eq("assessment_id", a.id)
      .maybeSingle(),
    db.from("attempts").select("id", { count: "exact", head: true }).eq("student_id", studentId).eq("assessment_id", a.id),
  ]);
  const extra = compute(count ?? 0, setting?.extra_attempts ?? 0, a.max_attempts);
  const { error } = await db.from("student_assessment_settings").upsert({
    student_id: studentId,
    assessment_id: a.id,
    extra_attempts: extra,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

// Reset: student gets the full max_attempts again from now.
export async function resetAttempts(studentId: string) {
  await requireAdmin();
  await changeExtra(studentId, (used) => used);
  revalidatePath("/admin");
}

export async function addOneAttempt(studentId: string) {
  await requireAdmin();
  await changeExtra(studentId, (_used, extra) => extra + 1);
  revalidatePath("/admin");
}

export async function setStudentStatus(studentId: string, status: "active" | "disabled") {
  const me = await requireAdmin();
  if (studentId === me.id) return;
  await adminDb().from("profiles").update({ status }).eq("id", studentId);
  revalidatePath("/admin");
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await setPassword(String(form.get("id")), String(form.get("password") ?? ""));
    return { ok: "নতুন Password সেট হয়েছে।" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function reimportQuestions(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Excel ফাইল বেছে নিন।" };
  try {
    const res = await parseQuestionBank(Buffer.from(await file.arrayBuffer()));
    if (!res.questions.length) return { error: "কোনো প্রশ্ন পাওয়া যায়নি।" };
    const r = await syncQuestions(adminDb(), COURSE_CODE, res.questions);
    const s = summarize(res.questions);
    revalidatePath("/admin/questions");
    return {
      ok: `Import হয়েছে: MCQ ${s.byType.mcq}, Matching ${s.byType.matching}, Short ${s.byType.short}. বাদ পড়েছে ${res.failures.length}, বন্ধ করা হয়েছে ${r.deactivated}।`,
      details: reportMarkdown(res)
        .split("\n")
        .filter((l) => l.startsWith("| ") && /^\| \d/.test(l)),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setReportStatus(reportId: number, status: "open" | "closed") {
  await requireAdmin();
  await adminDb().from("question_reports").update({ status }).eq("id", reportId);
  revalidatePath("/admin/reports");
}

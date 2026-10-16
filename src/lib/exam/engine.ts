import "server-only";
import { adminDb } from "@/lib/supabase/admin";
import type { Assessment, Attempt, AttemptQuestion, QuestionRow, QuestionType, SelfMark } from "@/lib/types";
import { ANSWER_GRACE_MS, ASSESSMENT_CODE, MAX_SHORT_ANSWER_CHARS, MAX_VIOLATIONS_PER_ATTEMPT } from "./config";
import { isCorrect, normalizeAnswer, optionOrder, pickQuestions, score } from "./logic";

export class ExamError extends Error {}

const TYPE_ORDER: QuestionType[] = ["mcq", "matching", "short"];

function db() {
  return adminDb();
}

function must(res: { data: unknown; error: { message: string } | null }, what: string): unknown {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

export async function getAssessment(code = ASSESSMENT_CODE): Promise<Assessment> {
  const a = must(await db().from("assessments").select("*").eq("code", code).single(), "assessment");
  return a as Assessment;
}

export async function attemptAllowance(studentId: string, a: Assessment) {
  const [{ data: setting }, { count }] = await Promise.all([
    db()
      .from("student_assessment_settings")
      .select("extra_attempts")
      .eq("student_id", studentId)
      .eq("assessment_id", a.id)
      .maybeSingle(),
    db()
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("assessment_id", a.id),
  ]);
  const allowed = a.max_attempts + (setting?.extra_attempts ?? 0);
  const used = count ?? 0;
  return { allowed, used, remaining: Math.max(0, allowed - used) };
}

// ---------------------------------------------------------------- finishing

async function recomputeScore(attemptId: string, passMark: number) {
  const rows = must(
    await db().from("attempt_questions").select("is_correct, self_mark, question:questions(type)").eq("attempt_id", attemptId),
    "score rows",
  ) as unknown as { is_correct: boolean | null; self_mark: SelfMark | null; question: { type: QuestionType } }[];
  const s = score(
    rows.map((r) => ({ type: r.question.type, is_correct: r.is_correct, self_mark: r.self_mark })),
    passMark,
  );
  must(
    await db()
      .from("attempts")
      .update({ auto_score: s.auto_score, short_score: s.short_score, total: s.total, result: s.result })
      .eq("id", attemptId),
    "save score",
  );
  return s;
}

// Closes an attempt exactly once (submitted or expired) and scores the auto-marked part.
async function finishAttempt(attempt: Attempt, status: "submitted" | "expired") {
  const submittedAt = status === "expired" ? attempt.deadline_at : new Date().toISOString();
  const { data: won } = await db()
    .from("attempts")
    .update({ status, submitted_at: submittedAt })
    .eq("id", attempt.id)
    .eq("status", "in_progress")
    .select("id");
  if (!won?.length) return; // someone else already finished it

  const rows = must(
    await db().from("attempt_questions").select("id, answer, question:questions(type)").eq("attempt_id", attempt.id),
    "finish rows",
  ) as unknown as { id: string; answer: unknown; question: { type: QuestionType } }[];
  const unansweredAuto = rows.filter((r) => r.question.type !== "short" && r.answer == null).map((r) => r.id);
  const blankShort = rows
    .filter((r) => r.question.type === "short" && (r.answer == null || String(r.answer).trim() === ""))
    .map((r) => r.id);
  if (unansweredAuto.length)
    must(await db().from("attempt_questions").update({ is_correct: false }).in("id", unansweredAuto), "mark blanks");
  if (blankShort.length)
    must(await db().from("attempt_questions").update({ self_mark: "none" }).in("id", blankShort), "mark blank shorts");

  const a = must(await db().from("assessments").select("pass_mark").eq("id", attempt.assessment_id).single(), "pass mark") as {
    pass_mark: number;
  };
  await recomputeScore(attempt.id, Number(a.pass_mark));
}

function isPastDeadline(a: Attempt, graceMs = 0) {
  return Date.now() > new Date(a.deadline_at).getTime() + graceMs;
}

// Auto-submits every overdue running attempt of a student (called on dashboard/exam load).
export async function settleExpired(studentId: string) {
  const running = must(
    await db().from("attempts").select("*").eq("student_id", studentId).eq("status", "in_progress"),
    "running attempts",
  ) as Attempt[];
  for (const a of running) if (isPastDeadline(a)) await finishAttempt(a, "expired");
}

// ---------------------------------------------------------------- start

export async function startAttempt(studentId: string): Promise<string> {
  const a = await getAssessment();
  if (!a.active) throw new ExamError("এই Exam এখন বন্ধ আছে।");
  await settleExpired(studentId);

  const running = await getRunningAttempt(studentId, a.id);
  if (running) return running.id;

  const { used, remaining } = await attemptAllowance(studentId, a);
  if (remaining <= 0) throw new ExamError("আপনার সব Attempt শেষ। আরও Attempt লাগলে Hadia Academy-র সাথে যোগাযোগ করুন।");

  // Questions this student already got, so new attempts prefer fresh ones.
  const prev = must(
    await db().from("attempts").select("attempt_questions(question_id)").eq("student_id", studentId),
    "previous questions",
  ) as { attempt_questions: { question_id: string }[] }[];
  const seen = new Set(prev.flatMap((p) => p.attempt_questions.map((q) => q.question_id)));

  const counts: Record<QuestionType, number> = { mcq: a.mcq_count, matching: a.matching_count, short: a.short_count };
  const chosen: { id: string; type: QuestionType; options: QuestionRow["options"] }[] = [];
  for (const type of TYPE_ORDER) {
    const pool = must(
      await db().from("questions").select("id, is_ff, options").eq("course_id", a.course_id).eq("type", type).eq("active", true),
      "question pool",
    ) as { id: string; is_ff: boolean; options: QuestionRow["options"] }[];
    if (pool.length < counts[type]) throw new Error(`Not enough ${type} questions (${pool.length}/${counts[type]})`);
    const ids = pickQuestions(pool, counts[type], seen);
    const byId = new Map(pool.map((q) => [q.id, q]));
    ids.forEach((id) => chosen.push({ id, type, options: byId.get(id)!.options }));
  }

  const deadline = new Date(Date.now() + a.duration_min * 60_000).toISOString();
  const { data: created, error } = await db()
    .from("attempts")
    .insert({ student_id: studentId, assessment_id: a.id, attempt_no: used + 1, deadline_at: deadline })
    .select("id")
    .single();
  if (error) {
    // Double click / two tabs: the unique indexes reject the second insert.
    const again = await getRunningAttempt(studentId, a.id);
    if (again) return again.id;
    throw new Error(`start attempt: ${error.message}`);
  }

  const rows = chosen.map((q, i) => ({
    attempt_id: created.id,
    position: i + 1,
    question_id: q.id,
    option_order: optionOrder(q.type, q.options),
  }));
  const { error: qErr } = await db().from("attempt_questions").insert(rows);
  if (qErr) {
    await db().from("attempts").delete().eq("id", created.id);
    throw new Error(`attempt questions: ${qErr.message}`);
  }
  return created.id as string;
}

async function getRunningAttempt(studentId: string, assessmentId: string) {
  const { data } = await db()
    .from("attempts")
    .select("*")
    .eq("student_id", studentId)
    .eq("assessment_id", assessmentId)
    .eq("status", "in_progress")
    .maybeSingle();
  return data as Attempt | null;
}

// ---------------------------------------------------------------- during the exam

export async function getOwnAttempt(studentId: string, attemptId: string): Promise<Attempt | null> {
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) return null;
  const { data } = await db().from("attempts").select("*").eq("id", attemptId).eq("student_id", studentId).maybeSingle();
  return data as Attempt | null;
}

export type ExamOption = { value: string | number; label: string; text: string };

export type ExamView =
  | { kind: "finished" }
  | { kind: "confirm"; attempt: Attempt; total: number; answered: number; remainingMs: number }
  | {
      kind: "question";
      attempt: Attempt;
      remainingMs: number;
      total: number;
      position: number;
      type: QuestionType;
      question: string;
      options: ExamOption[];
    };

// Everything the exam screen may show — never answer keys or model answers.
export async function getExamView(studentId: string, attemptId: string): Promise<ExamView | null> {
  let attempt = await getOwnAttempt(studentId, attemptId);
  if (!attempt) return null;
  if (attempt.status === "in_progress" && isPastDeadline(attempt)) {
    await finishAttempt(attempt, "expired");
    attempt = (await getOwnAttempt(studentId, attemptId))!;
  }
  if (attempt.status !== "in_progress") return { kind: "finished" };

  const { count } = await db()
    .from("attempt_questions")
    .select("id", { count: "exact", head: true })
    .eq("attempt_id", attempt.id);
  const total = count ?? 0;
  const remainingMs = Math.max(0, new Date(attempt.deadline_at).getTime() - Date.now());
  if (attempt.current_position > total) {
    return { kind: "confirm", attempt, total, answered: total, remainingMs };
  }

  const row = must(
    await db()
      .from("attempt_questions")
      .select("option_order, question:questions(type, question, options)")
      .eq("attempt_id", attempt.id)
      .eq("position", attempt.current_position)
      .single(),
    "current question",
  ) as unknown as {
    option_order: (string | number)[] | null;
    question: { type: QuestionType; question: string; options: QuestionRow["options"] };
  };
  const q = row.question;
  let options: ExamOption[] = [];
  if (q.type === "mcq" && q.options && !Array.isArray(q.options)) {
    const opts = q.options;
    options = (row.option_order as string[]).map((orig, i) => ({
      value: orig,
      label: "ABCD"[i],
      text: opts[orig],
    }));
  } else if (q.type === "matching" && Array.isArray(q.options)) {
    const opts = q.options;
    options = (row.option_order as number[]).map((idx, i) => ({
      value: idx,
      label: "ABCDEFGHIJ"[i],
      text: opts[idx],
    }));
  }
  return {
    kind: "question",
    attempt,
    remainingMs,
    total,
    position: attempt.current_position,
    type: q.type,
    question: q.question,
    options,
  };
}

export type SaveResult = { ok: true } | { ok: false; reason: "expired" | "stale" | "invalid" | "closed" };

export async function saveAnswer(
  studentId: string,
  attemptId: string,
  position: number,
  raw: unknown,
): Promise<SaveResult> {
  const attempt = await getOwnAttempt(studentId, attemptId);
  if (!attempt || attempt.status !== "in_progress") return { ok: false, reason: "closed" };
  if (isPastDeadline(attempt, ANSWER_GRACE_MS)) {
    await finishAttempt(attempt, "expired");
    return { ok: false, reason: "expired" };
  }
  if (position !== attempt.current_position) return { ok: false, reason: "stale" };

  const row = must(
    await db()
      .from("attempt_questions")
      .select("id, answered_at, question:questions(type, options, answer_key)")
      .eq("attempt_id", attempt.id)
      .eq("position", position)
      .single(),
    "answer row",
  ) as unknown as {
    id: string;
    answered_at: string | null;
    question: { type: QuestionType; options: QuestionRow["options"]; answer_key: string | null };
  };
  const q = row.question;
  let answer = normalizeAnswer(q.type, q.options, raw);
  if (q.type === "short") answer = typeof answer === "string" ? answer.slice(0, MAX_SHORT_ANSWER_CHARS) : "";
  else if (answer == null) return { ok: false, reason: "invalid" };

  if (!row.answered_at) {
    must(
      await db()
        .from("attempt_questions")
        .update({
          answer,
          answered_at: new Date().toISOString(),
          is_correct: isCorrect(q.type, q.options, q.answer_key, answer),
        })
        .eq("id", row.id)
        .is("answered_at", null),
      "save answer",
    );
  }
  must(
    await db()
      .from("attempts")
      .update({ current_position: position + 1 })
      .eq("id", attempt.id)
      .eq("current_position", position),
    "advance",
  );
  return { ok: true };
}

export async function submitAttempt(studentId: string, attemptId: string) {
  const attempt = await getOwnAttempt(studentId, attemptId);
  if (!attempt) throw new ExamError("Attempt পাওয়া যায়নি।");
  if (attempt.status !== "in_progress") return;
  await finishAttempt(attempt, isPastDeadline(attempt, ANSWER_GRACE_MS) ? "expired" : "submitted");
}

export async function recordViolation(studentId: string, attemptId: string, type: string, meta: unknown) {
  const attempt = await getOwnAttempt(studentId, attemptId);
  if (!attempt || attempt.status !== "in_progress") return;
  const { count } = await db()
    .from("violations")
    .select("id", { count: "exact", head: true })
    .eq("attempt_id", attemptId);
  if ((count ?? 0) >= MAX_VIOLATIONS_PER_ATTEMPT) return;
  await db()
    .from("violations")
    .insert({ attempt_id: attemptId, type: type.slice(0, 40), meta: meta ?? null });
}

// ---------------------------------------------------------------- after the exam

export type ReviewItem = AttemptQuestion & {
  question: Pick<QuestionRow, "id" | "type" | "cblm_no" | "question" | "options" | "answer_key" | "model_answer" | "cblm_page" | "cblm_page_reviewed">;
};

export async function getReview(attemptId: string) {
  const items = must(
    await db()
      .from("attempt_questions")
      .select(
        "*, question:questions(id, type, cblm_no, question, options, answer_key, model_answer, cblm_page, cblm_page_reviewed)",
      )
      .eq("attempt_id", attemptId)
      .order("position"),
    "review",
  ) as unknown as ReviewItem[];
  return items;
}

export async function setSelfMark(studentId: string, attemptQuestionId: string, mark: SelfMark) {
  if (!["full", "partial", "none"].includes(mark)) throw new ExamError("Invalid mark");
  const row = must(
    await db()
      .from("attempt_questions")
      .select("id, attempt_id, question:questions(type), attempt:attempts(student_id, status, assessment_id)")
      .eq("id", attemptQuestionId)
      .single(),
    "self-mark row",
  ) as unknown as {
    id: string;
    attempt_id: string;
    question: { type: QuestionType };
    attempt: { student_id: string; status: string; assessment_id: string };
  };
  if (row.attempt.student_id !== studentId) throw new ExamError("Not allowed");
  if (row.attempt.status === "in_progress") throw new ExamError("Exam এখনো চলছে");
  if (row.question.type !== "short") throw new ExamError("Only Short questions are self-marked");
  must(await db().from("attempt_questions").update({ self_mark: mark }).eq("id", row.id), "self-mark");
  const a = must(await db().from("assessments").select("pass_mark").eq("id", row.attempt.assessment_id).single(), "pass mark") as {
    pass_mark: number;
  };
  return recomputeScore(row.attempt_id, Number(a.pass_mark));
}

export async function reportQuestion(studentId: string, attemptId: string, questionId: string, message: string) {
  const text = message.trim().slice(0, 2000);
  if (!text) throw new ExamError("সমস্যাটা লিখুন।");
  const attempt = await getOwnAttempt(studentId, attemptId);
  if (!attempt || attempt.status === "in_progress") throw new ExamError("Not allowed");
  const { count } = await db()
    .from("attempt_questions")
    .select("id", { count: "exact", head: true })
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId);
  if (!count) throw new ExamError("Not allowed");
  must(
    await db().from("question_reports").insert({ attempt_id: attemptId, question_id: questionId, student_id: studentId, message: text }),
    "report",
  );
}

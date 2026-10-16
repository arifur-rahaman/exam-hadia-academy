"use server";

import { requireStudent } from "@/lib/auth";
import { ExamError, reportQuestion, setSelfMark } from "@/lib/exam/engine";
import type { SelfMark } from "@/lib/types";

export async function markShort(attemptQuestionId: string, mark: SelfMark): Promise<{ error?: string }> {
  const me = await requireStudent();
  try {
    await setSelfMark(me.id, attemptQuestionId, mark);
    return {};
  } catch (e) {
    if (e instanceof ExamError) return { error: e.message };
    console.error(e);
    return { error: "Save করা যায়নি। আবার চেষ্টা করুন।" };
  }
}

export async function sendReport(attemptId: string, questionId: string, message: string): Promise<{ error?: string }> {
  const me = await requireStudent();
  try {
    await reportQuestion(me.id, attemptId, questionId, message);
    return {};
  } catch (e) {
    if (e instanceof ExamError) return { error: e.message };
    console.error(e);
    return { error: "পাঠানো যায়নি। আবার চেষ্টা করুন।" };
  }
}

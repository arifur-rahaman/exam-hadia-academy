"use server";

import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { saveAnswer, submitAttempt, type SaveResult } from "@/lib/exam/engine";

export async function answerQuestion(attemptId: string, position: number, answer: unknown): Promise<SaveResult> {
  const me = await requireStudent();
  return saveAnswer(me.id, attemptId, position, answer);
}

export async function finishExam(attemptId: string) {
  const me = await requireStudent();
  await submitAttempt(me.id, attemptId);
  redirect(`/result/${attemptId}`);
}

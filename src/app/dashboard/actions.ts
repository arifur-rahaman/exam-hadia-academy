"use server";

import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { ExamError, startAttempt } from "@/lib/exam/engine";

export async function startExam(): Promise<{ error?: string }> {
  const me = await requireStudent();
  let id: string;
  try {
    id = await startAttempt(me.id);
  } catch (e) {
    if (e instanceof ExamError) return { error: e.message };
    console.error(e);
    return { error: "Exam শুরু করা যায়নি। আবার চেষ্টা করুন।" };
  }
  redirect(`/exam/${id}`);
}

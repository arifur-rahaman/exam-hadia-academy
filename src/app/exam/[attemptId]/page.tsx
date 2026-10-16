import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getExamView } from "@/lib/exam/engine";
import { fmtDateTime } from "@/lib/format";
import { maskMobile } from "@/lib/mobile";
import { ConfirmSubmit } from "./ConfirmSubmit";
import { ExamGuard } from "./ExamGuard";
import { ExamHeader } from "./ExamHeader";
import { QuestionForm } from "./QuestionForm";
import { Watermark } from "./Watermark";

export const metadata: Metadata = { title: "Exam · Hadia Academy" };

export default async function ExamPage({ params }: PageProps<"/exam/[attemptId]">) {
  const { attemptId } = await params;
  const me = await requireStudent();
  const view = await getExamView(me.id, attemptId);
  if (!view) notFound();
  if (view.kind === "finished") redirect(`/result/${attemptId}`);

  const watermark = [me.full_name, me.student_code, maskMobile(me.mobile), me.email, fmtDateTime(view.attempt.started_at)]
    .filter(Boolean)
    .join(" · ");

  const position = view.kind === "question" ? view.position : view.total;
  const typeLabel = view.kind === "question" ? { mcq: "MCQ", matching: "Matching", short: "Short" }[view.type] : "Submit";

  return (
    <ExamGuard attemptId={attemptId}>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-surface">
        <ExamHeader
          attemptId={attemptId}
          label={`Question ${position} / ${view.total} · ${typeLabel}`}
          progress={view.kind === "question" ? (view.position - 1) / view.total : 1}
          remainingMs={view.remainingMs}
        />
        {view.kind === "question" ? (
          <QuestionForm
            key={`${attemptId}-${view.position}`}
            attemptId={attemptId}
            position={view.position}
            total={view.total}
            type={view.type}
            question={view.question}
            options={view.options}
          />
        ) : (
          <ConfirmSubmit attemptId={attemptId} total={view.total} />
        )}
        <Watermark text={watermark} />
      </div>
    </ExamGuard>
  );
}

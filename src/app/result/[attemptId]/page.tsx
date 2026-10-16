import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ReviewCard } from "@/components/ReviewCard";
import { requireStudent } from "@/lib/auth";
import { getAssessment, getOwnAttempt, getReview, settleExpired } from "@/lib/exam/engine";
import { score } from "@/lib/exam/logic";
import { fmtDate, fmtScore } from "@/lib/format";
import { ReportProblem } from "./ReportProblem";
import { SelfMarkButtons } from "./SelfMarkButtons";

export const metadata: Metadata = { title: "Result · Hadia Academy" };

export default async function ResultPage({ params }: PageProps<"/result/[attemptId]">) {
  const { attemptId } = await params;
  const me = await requireStudent();
  await settleExpired(me.id);
  const attempt = await getOwnAttempt(me.id, attemptId);
  if (!attempt) notFound();
  if (attempt.status === "in_progress") redirect(`/exam/${attemptId}`);

  const [a, items] = await Promise.all([getAssessment(), getReview(attemptId)]);
  const s = score(
    items.map((i) => ({ type: i.question.type, is_correct: i.is_correct, self_mark: i.self_mark })),
    Number(a.pass_mark),
  );
  const count = (t: string) => items.filter((i) => i.question.type === t).length;
  const correct = (t: string) => items.filter((i) => i.question.type === t && i.is_correct).length;
  const totalMarks = items.length;
  const autoMax = count("mcq") + count("matching");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-bg">
      <AppHeader name={me.full_name} />
      <main className="flex flex-col gap-4 px-5 py-5">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex min-h-touch items-center pr-2 text-lg" aria-label="Dashboard-এ ফিরুন">
            ‹
          </Link>
          <h1 className="font-semibold">
            {a.title} · Attempt {attempt.attempt_no} · {fmtDate(attempt.started_at)}
          </h1>
        </div>

        <section className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-5 text-center">
          {s.total != null ? (
            <>
              <p className="text-sm text-muted">আপনার মোট Score</p>
              <p className="text-[40px] leading-none font-bold">
                {fmtScore(s.total)} / {totalMarks}
              </p>
              {s.result === "competent" ? (
                <p className="rounded-chip bg-success-soft px-3 py-1.5 text-sm font-semibold text-success">
                  অভিনন্দন! আপনি Competent
                </p>
              ) : (
                <p className="rounded-chip bg-chip px-3 py-1.5 text-sm font-semibold">
                  এখনো Not Yet Competent — আবার চেষ্টা করুন
                </p>
              )}
              <p className="text-xs text-subtle">Pass: {fmtScore(a.pass_mark)} বা তার বেশি</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">আপনার Score (MCQ + Matching)</p>
              <p className="text-[40px] leading-none font-bold">
                {s.auto_score} / {autoMax}
              </p>
              <p className="rounded-chip bg-warning-soft px-3 py-1.5 text-sm text-warning">
                Short মেলানো বাকি ({s.shortsMarked}/{s.shortsTotal}) — নিচে প্রতিটি Short মিলিয়ে নিন
              </p>
            </>
          )}
          {attempt.status === "expired" && (
            <p className="text-xs text-subtle">সময় শেষ হওয়ায় Exam নিজে থেকে Submit হয়েছে।</p>
          )}
        </section>

        <div className="grid grid-cols-3 gap-2.5">
          <Mini label="MCQ" value={`${correct("mcq")} / ${count("mcq")}`} />
          <Mini label="Matching" value={`${correct("matching")} / ${count("matching")}`} />
          <Mini label="Short (নিজে মিলিয়েছেন)" value={`${fmtScore(s.short_score)} / ${count("short")}`} />
        </div>

        <h2 className="mt-1 text-[15px] font-semibold">Answer Review</h2>
        {items.map((item) => (
          <ReviewCard
            key={item.id}
            item={item}
            footer={
              <>
                {item.question.type === "short" && <SelfMarkButtons id={item.id} current={item.self_mark} />}
                <ReportProblem attemptId={attemptId} questionId={item.question_id} />
              </>
            }
          />
        ))}

        <p className="text-xs text-subtle">
          এটি একটি Practice Formative Assessment, কোনো Official Certificate নয়।
        </p>
      </main>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireStudent } from "@/lib/auth";
import { attemptAllowance, getAssessment, settleExpired } from "@/lib/exam/engine";
import { fmtDate, fmtScore } from "@/lib/format";
import { adminDb } from "@/lib/supabase/admin";
import type { Attempt } from "@/lib/types";
import { StartExamButton } from "./StartExamButton";

export const metadata: Metadata = { title: "Dashboard · Hadia Academy" };

export default async function DashboardPage() {
  const me = await requireStudent();
  await settleExpired(me.id);
  const a = await getAssessment();
  const [{ remaining, allowed }, { data }] = await Promise.all([
    attemptAllowance(me.id, a),
    adminDb()
      .from("attempts")
      .select("*")
      .eq("student_id", me.id)
      .eq("assessment_id", a.id)
      .order("started_at", { ascending: false }),
  ]);
  const attempts = (data ?? []) as Attempt[];
  const running = attempts.find((x) => x.status === "in_progress");
  const finished = attempts.filter((x) => x.status !== "in_progress");
  const totals = finished.map((x) => x.total).filter((t): t is number => t != null);
  const best = totals.length ? Math.max(...totals.map(Number)) : null;
  const totalMarks = a.mcq_count + a.matching_count + a.short_count;
  const firstName = me.full_name.split(/\s+/)[0];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-bg">
      <AppHeader name={me.full_name} />
      <main className="flex flex-col gap-5 px-5 py-5">
        <div>
          <h1 className="text-xl font-bold">Welcome, {firstName}</h1>
          <p className="text-sm text-muted">
            CBT&amp;A Level 4 · {me.student_code}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Exam দিয়েছেন" value={String(finished.length)} />
          <Stat label="Best Score" value={best == null ? "—" : `${fmtScore(best)}/${totalMarks}`} />
          <Stat label="Attempt বাকি" value={`${remaining}/${allowed}`} />
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">Exam দিন</h2>
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{a.title}</h3>
              <span className="shrink-0 rounded-chip bg-accent-soft px-2 py-1 text-xs text-accent-ink">
                {remaining}/{allowed} Attempt বাকি
              </span>
            </div>
            <p className="text-sm text-muted">
              {a.mcq_count} MCQ · {a.matching_count} Matching · {a.short_count} Short · {a.duration_min} মিনিট ·
              Pass {fmtScore(a.pass_mark)}/{totalMarks}
            </p>
            {running ? (
              <Link
                href={`/exam/${running.id}`}
                className="flex h-button items-center justify-center rounded-control bg-primary font-semibold text-on-primary hover:bg-primary-hover"
              >
                Exam চালিয়ে যান
              </Link>
            ) : (
              <StartExamButton label="Start Exam" disabled={remaining <= 0} />
            )}
            {!running && remaining <= 0 && (
              <p className="text-sm text-muted">আরও Attempt লাগলে Hadia Academy-র সাথে যোগাযোগ করুন।</p>
            )}
            <p className="text-xs text-subtle">
              একবার শুরু করলে টাইমার থামবে না। Submit করলে আগের Question-এ আর ফেরা যাবে না।
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-semibold">Previous Results</h2>
          {finished.length === 0 && <p className="text-sm text-muted">এখনো কোনো Exam দেননি।</p>}
          {finished.map((x) => (
            <Link
              key={x.id}
              href={`/result/${x.id}`}
              className="flex min-h-touch items-center justify-between rounded-card border border-border bg-surface px-4 py-3 text-sm hover:border-accent"
            >
              <span>
                Attempt {x.attempt_no} · {fmtDate(x.started_at)}
                {x.result === "pending" && <span className="ml-1.5 text-xs text-warning">· Short মেলানো বাকি</span>}
              </span>
              <span className="font-bold">
                {x.total != null ? `${fmtScore(x.total)}/${totalMarks}` : `${fmtScore(x.auto_score)}/${a.mcq_count + a.matching_count} + Short`}
              </span>
            </Link>
          ))}
        </section>

        <p className="text-xs text-subtle">
          এটি একটি Practice Formative Assessment, কোনো Official Certificate নয়।
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

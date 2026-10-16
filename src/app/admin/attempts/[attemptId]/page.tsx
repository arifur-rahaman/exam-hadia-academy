import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewCard } from "@/components/ReviewCard";
import { getReview } from "@/lib/exam/engine";
import { fmtDateTime, fmtDuration, fmtScore } from "@/lib/format";
import { displayMobile } from "@/lib/mobile";
import { adminDb } from "@/lib/supabase/admin";
import type { Attempt, Profile } from "@/lib/types";
import { Card, Chip } from "../../ui";

const MARK = { full: "পুরো মিলেছে", partial: "আংশিক", none: "মেলেনি" } as const;

export default async function AttemptDetailPage({ params }: PageProps<"/admin/attempts/[attemptId]">) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const db = adminDb();
  const { data } = await db
    .from("attempts")
    .select("*, student:profiles(full_name, student_code, mobile, email)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!data) notFound();
  const attempt = data as unknown as Attempt & { student: Profile };
  const [items, { data: violations }] = await Promise.all([
    attempt.status === "in_progress" ? Promise.resolve([]) : getReview(attemptId),
    db.from("violations").select("type, occurred_at").eq("attempt_id", attemptId).order("occurred_at"),
  ]);
  const byType = new Map<string, number>();
  (violations ?? []).forEach((v) => byType.set(v.type, (byType.get(v.type) ?? 0) + 1));

  return (
    <>
      <Link href="/admin/attempts" className="text-sm text-muted">
        ‹ Attempts
      </Link>
      <h1 className="text-lg font-bold">
        {attempt.student.student_code} · {attempt.student.full_name} · Attempt #{attempt.attempt_no}
      </h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Summary">
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-muted">মোবাইল</dt>
            <dd>{displayMobile(attempt.student.mobile)}</dd>
            <dt className="text-muted">শুরু</dt>
            <dd>{fmtDateTime(attempt.started_at)}</dd>
            <dt className="text-muted">শেষ</dt>
            <dd>{fmtDateTime(attempt.submitted_at)}</dd>
            <dt className="text-muted">সময় লেগেছে</dt>
            <dd>{fmtDuration(attempt.started_at, attempt.submitted_at)}</dd>
            <dt className="text-muted">Status</dt>
            <dd>{attempt.status}</dd>
            <dt className="text-muted">MCQ + Matching</dt>
            <dd>{fmtScore(attempt.auto_score)}</dd>
            <dt className="text-muted">Short (self)</dt>
            <dd>{fmtScore(attempt.short_score)}</dd>
            <dt className="text-muted">Total</dt>
            <dd className="font-bold">{fmtScore(attempt.total)}</dd>
            <dt className="text-muted">Result</dt>
            <dd>{attempt.result}</dd>
          </dl>
        </Card>
        <Card title={`Tab switch / Copy (${violations?.length ?? 0}) — শুধু রেকর্ড, কোনো শাস্তি নয়`}>
          <div className="flex flex-wrap gap-1.5">
            {[...byType].map(([t, n]) => (
              <Chip key={t} tone="warning">
                {t}: {n}
              </Chip>
            ))}
            {!violations?.length && <Chip tone="success">কিছু নেই</Chip>}
          </div>
          {!!violations?.length && (
            <ul className="max-h-48 overflow-auto text-xs text-muted">
              {violations.map((v, i) => (
                <li key={i}>
                  {fmtDateTime(v.occurred_at)} — {v.type}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {attempt.status === "in_progress" ? (
        <p className="text-sm text-muted">Exam এখনো চলছে — শেষ হলে উত্তর দেখা যাবে।</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              footer={
                item.question.type === "short" ? (
                  <p className="text-xs text-muted">
                    Self-mark: <strong>{item.self_mark ? MARK[item.self_mark] : "এখনো দেয়নি"}</strong>
                  </p>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

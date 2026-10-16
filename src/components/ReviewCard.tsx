import type { ReactNode } from "react";
import { cblmRef } from "@/lib/cblm";
import type { ReviewItem } from "@/lib/exam/engine";

const TYPE_LABEL = { mcq: "MCQ", matching: "Matching", short: "Short" } as const;

function optionText(item: ReviewItem, value: unknown): string | null {
  const opts = item.question.options;
  if (value == null) return null;
  if (item.question.type === "mcq" && opts && !Array.isArray(opts)) return opts[String(value)] ?? null;
  if (item.question.type === "matching" && Array.isArray(opts)) return opts[Number(value)] ?? null;
  return null;
}

// One reviewed question. `footer` holds student-only controls (self-mark, report).
export function ReviewCard({ item, footer }: { item: ReviewItem; footer?: ReactNode }) {
  const q = item.question;
  const ref = cblmRef(q.cblm_no, q.cblm_page, q.cblm_page_reviewed);
  const correctText = q.type === "mcq" ? optionText(item, q.answer_key) : q.answer_key;

  return (
    <article className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          Q{item.position} · {TYPE_LABEL[q.type]}
          {q.cblm_no ? ` · CBLM ${q.cblm_no}` : ""}
        </span>
        {q.type === "short" ? (
          <span className={item.self_mark ? "text-muted" : "font-semibold text-warning"}>
            {item.self_mark ? "মেলানো হয়েছে" : "নিজে মিলিয়ে নিন"}
          </span>
        ) : item.is_correct ? (
          <span className="rounded-chip bg-success-soft px-2 py-0.5 font-semibold text-success">সঠিক</span>
        ) : (
          <span className="rounded-chip bg-danger-soft px-2 py-0.5 font-semibold text-danger-text">ভুল</span>
        )}
      </div>
      <h3 className="text-[15px] leading-relaxed font-semibold whitespace-pre-line">{q.question}</h3>

      {q.type !== "short" ? (
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-muted">
            আপনার Answer: {optionText(item, item.answer) ?? <em>উত্তর দেওয়া হয়নি</em>}
          </p>
          {!item.is_correct && <p className="font-semibold text-success">সঠিক Answer: {correctText}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-xs text-muted">আপনার Answer</p>
          <p className="rounded-control bg-bg p-3 whitespace-pre-line">
            {item.answer ? String(item.answer) : <em className="text-subtle">খালি রাখা হয়েছে</em>}
          </p>
          <p className="text-xs text-muted">Model Answer</p>
          <p className="rounded-control bg-accent-soft p-3 whitespace-pre-line text-primary">{q.model_answer}</p>
        </div>
      )}

      {ref && (
        <p className="flex items-start gap-2 rounded-control border border-border px-3 py-2 text-xs text-muted">
          <span aria-hidden className="text-accent">📖</span>
          {ref}
        </p>
      )}
      {footer}
    </article>
  );
}

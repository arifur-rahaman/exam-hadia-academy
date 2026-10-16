"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ExamOption } from "@/lib/exam/engine";
import type { QuestionType } from "@/lib/types";
import { answerQuestion } from "./actions";
import { reportViolation } from "./ExamGuard";

export function QuestionForm({
  attemptId,
  position,
  total,
  type,
  question,
  options,
}: {
  attemptId: string;
  position: number;
  total: number;
  type: QuestionType;
  question: string;
  options: ExamOption[];
}) {
  const router = useRouter();
  const draftKey = `draft:${attemptId}:${position}`;
  const [choice, setChoice] = useState<string | number | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Keep an unsent Short answer through a refresh (this device only).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved && textRef.current && !textRef.current.value) textRef.current.value = saved;
    } catch {}
  }, [draftKey]);

  const ready = type === "short" ? true : choice != null;

  function submit() {
    const text = textRef.current?.value ?? "";
    if (type === "short" && !text.trim() && !confirm("উত্তর খালি রেখে পরের Question-এ যাবেন?")) return;
    setError(null);
    start(async () => {
      const res = await answerQuestion(attemptId, position, type === "short" ? text : choice);
      if (res.ok || res.reason === "stale") {
        try {
          sessionStorage.removeItem(draftKey);
        } catch {}
        router.refresh();
      } else if (res.reason === "expired" || res.reason === "closed") {
        router.push(`/result/${attemptId}`);
      } else {
        setError("একটি অপশন বেছে নিন।");
      }
    });
  }

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 px-5 py-5">
        <h1 className="text-lg leading-relaxed font-semibold whitespace-pre-line">{question}</h1>

        {type === "matching" && <p className="-mt-2 text-sm text-muted">সঠিক মিলটি বেছে নিন:</p>}

        {type !== "short" ? (
          <div role="radiogroup" aria-label="Options" className="flex flex-col gap-2.5">
            {options.map((o) => {
              const selected = choice === o.value;
              return (
                <button
                  key={String(o.value)}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setChoice(o.value)}
                  className={`min-h-[52px] rounded-control px-3.5 py-3 text-left text-[15px] ${
                    selected ? "border-2 border-accent bg-accent-soft font-semibold" : "border border-input bg-surface"
                  }`}
                >
                  {o.label}) {o.text}
                </button>
              );
            })}
          </div>
        ) : (
          <label className="flex flex-col gap-2 text-sm font-semibold">
            আপনার Answer
            <textarea
              ref={textRef}
              onChange={(e) => {
                try {
                  sessionStorage.setItem(draftKey, e.target.value);
                } catch {}
              }}
              onPaste={(e) => {
                e.preventDefault();
                reportViolation(attemptId, "paste");
              }}
              onDrop={(e) => e.preventDefault()}
              rows={9}
              maxLength={5000}
              placeholder="এখানে লিখুন..."
              className="exam-input rounded-control border border-input bg-surface p-3.5 text-base font-normal"
            />
            <span className="text-xs font-normal text-subtle">
              Paste বন্ধ · Exam শেষে Model Answer আর CBLM reference দেখতে পাবেন
            </span>
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-text">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-surface px-5 py-4">
        <button
          type="button"
          onClick={submit}
          disabled={!ready || pending}
          className="h-button rounded-control bg-primary text-base font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Save হচ্ছে…" : position === total ? "Submit & Finish" : "Submit & Next"}
        </button>
        <p className="text-center text-xs text-subtle">Submit করলে আগের Question-এ আর ফেরা যাবে না</p>
      </div>
    </div>
  );
}

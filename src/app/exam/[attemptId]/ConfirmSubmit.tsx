"use client";

import { useTransition } from "react";
import { finishExam } from "./actions";

export function ConfirmSubmit({ attemptId, total }: { attemptId: string; total: number }) {
  const [pending, start] = useTransition();
  return (
    <div className="relative z-10 flex flex-1 flex-col justify-center gap-4 px-5 py-8 text-center">
      <h1 className="text-xl font-bold">সব {total}টি Question-এর উত্তর দেওয়া হয়েছে</h1>
      <p className="text-sm text-muted">
        এখন Exam Submit করুন। Submit-এর পর Score, সঠিক Answer আর Model Answer দেখতে পাবেন।
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => finishExam(attemptId))}
        className="h-button rounded-control bg-primary text-base font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Submit হচ্ছে…" : "Exam Submit করুন"}
      </button>
    </div>
  );
}

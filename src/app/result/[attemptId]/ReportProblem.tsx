"use client";

import { useState, useTransition } from "react";
import { sendReport } from "./actions";

export function ReportProblem({ attemptId, questionId }: { attemptId: string; questionId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sent" | string>("idle");
  const [pending, start] = useTransition();

  if (state === "sent") return <p className="text-sm text-success">ধন্যবাদ! আপনার Report পাঠানো হয়েছে।</p>;
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-touch self-start text-sm text-muted underline underline-offset-2"
      >
        এই প্রশ্নে সমস্যা Report করুন
      </button>
    );
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="কী সমস্যা? (যেমন: সঠিক Answer ভুল মনে হচ্ছে)"
        className="rounded-control border border-input p-3 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !text.trim()}
          onClick={() =>
            start(async () => {
              const r = await sendReport(attemptId, questionId, text);
              setState(r.error ?? "sent");
            })
          }
          className="min-h-touch rounded-control bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          পাঠান
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-touch px-3 text-sm text-muted">
          বাতিল
        </button>
      </div>
      {state !== "idle" && <p className="text-sm text-danger-text">{state}</p>}
    </div>
  );
}

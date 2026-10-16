"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { finishExam } from "./actions";

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Counts down from the server's remaining time (not the device clock); auto-submits at zero.
export function ExamHeader({
  attemptId,
  label,
  progress,
  remainingMs,
}: {
  attemptId: string;
  label: string;
  progress: number;
  remainingMs: number;
}) {
  const router = useRouter();
  const [end] = useState(() => Date.now() + remainingMs);
  const [left, setLeft] = useState(remainingMs);

  useEffect(() => {
    let done = false;
    const id = setInterval(() => {
      const l = end - Date.now();
      setLeft(l);
      if (l <= 0 && !done) {
        done = true;
        clearInterval(id);
        finishExam(attemptId).catch(() => router.push(`/result/${attemptId}`));
      }
    }, 500);
    return () => clearInterval(id);
  }, [end, attemptId, router]);

  const low = left < 5 * 60_000;
  return (
    <div className="relative z-10 border-b border-border bg-surface px-5 pt-4 pb-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span
          role="timer"
          aria-label="সময় বাকি"
          className={`rounded-chip px-2.5 py-1.5 text-[15px] font-bold tabular-nums ${
            low ? "bg-danger-soft text-danger-text" : "bg-chip"
          }`}
        >
          {fmt(left)}
        </span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-chip">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}

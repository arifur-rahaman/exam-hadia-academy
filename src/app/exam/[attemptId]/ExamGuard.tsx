"use client";

import { useEffect, type ReactNode } from "react";

const last = new Map<string, number>();

// Records (never penalises) suspicious events. Throttled per type.
export function reportViolation(attemptId: string, type: string, meta?: Record<string, unknown>) {
  const now = Date.now();
  if (now - (last.get(type) ?? 0) < 2000) return;
  last.set(type, now);
  const body = JSON.stringify({ attemptId, type, meta });
  if (!navigator.sendBeacon?.("/api/violations", new Blob([body], { type: "application/json" }))) {
    fetch("/api/violations", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(
      () => {},
    );
  }
}

export function ExamGuard({ attemptId, children }: { attemptId: string; children: ReactNode }) {
  useEffect(() => {
    const onVisibility = () => document.hidden && reportViolation(attemptId, "tab_hidden");
    const onBlur = () => reportViolation(attemptId, "window_blur");
    const block = (type: string) => (e: Event) => {
      e.preventDefault();
      reportViolation(attemptId, type);
    };
    const onCopy = block("copy");
    const onCut = block("cut");
    const onContext = block("contextmenu");
    const onPaste = block("paste");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("paste", onPaste);
    };
  }, [attemptId]);

  return <div className="exam-locked">{children}</div>;
}

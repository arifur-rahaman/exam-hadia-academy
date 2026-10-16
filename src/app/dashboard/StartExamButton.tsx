"use client";

import { useActionState } from "react";
import { startExam } from "./actions";

export function StartExamButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(startExam, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={disabled || pending}
        className="h-button rounded-control bg-primary text-base font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "শুরু হচ্ছে…" : label}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-danger-text">
          {state.error}
        </p>
      )}
    </form>
  );
}

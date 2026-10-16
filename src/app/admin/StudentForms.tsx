"use client";

import { useActionState, useTransition } from "react";
import {
  addOneAttempt,
  addStudent,
  changePassword,
  resetAttempts,
  setStudentStatus,
  uploadStudentsCsv,
  type FormState,
} from "./actions";
import { btnCls, btnGhostCls, FormMessage, inputCls } from "./ui";

export function AddStudentForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addStudent, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <input name="full_name" placeholder="পুরো নাম" required className={inputCls} />
        <input name="mobile" placeholder="01XXXXXXXXX" inputMode="numeric" required className={inputCls} />
        <input name="email" type="email" placeholder="Email (ঐচ্ছিক)" className={inputCls} />
        <input name="password" placeholder="Password (৮+ অক্ষর)" required minLength={8} className={inputCls} />
      </div>
      <button disabled={pending} className={`${btnCls} self-start`}>
        {pending ? "যোগ হচ্ছে…" : "Student যোগ করুন"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function CsvUploadForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadStudentsCsv, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        CSV-এর প্রথম লাইন: <code>name,mobile,email,password</code> (email খালি রাখা যায়)
      </p>
      <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
      <button disabled={pending} className={`${btnCls} self-start`}>
        {pending ? "Upload হচ্ছে…" : "CSV Upload করুন"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function StudentRowActions({ id, status }: { id: string; status: "active" | "disabled" }) {
  const [pending, start] = useTransition();
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        <button
          disabled={pending}
          className={btnGhostCls}
          onClick={() => confirm("এই Student-এর Attempt আবার পুরো (৩টা) করে দেবেন?") && start(() => resetAttempts(id))}
        >
          Reset attempts
        </button>
        <button disabled={pending} className={btnGhostCls} onClick={() => start(() => addOneAttempt(id))}>
          +1 attempt
        </button>
        <button
          disabled={pending}
          className={btnGhostCls}
          onClick={() =>
            confirm(status === "active" ? "Account বন্ধ করবেন?" : "Account আবার চালু করবেন?") &&
            start(() => setStudentStatus(id, status === "active" ? "disabled" : "active"))
          }
        >
          {status === "active" ? "Disable" : "Enable"}
        </button>
      </div>
      <details>
        <summary className="cursor-pointer text-xs text-muted">Password বদলান</summary>
        <form action={pwAction} className="mt-1 flex gap-1.5">
          <input type="hidden" name="id" value={id} />
          <input name="password" placeholder="নতুন Password" minLength={8} required className="h-9 rounded-control border border-input px-2 text-xs" />
          <button disabled={pwPending} className={btnGhostCls}>
            Save
          </button>
        </form>
        <FormMessage state={pwState} />
      </details>
    </div>
  );
}

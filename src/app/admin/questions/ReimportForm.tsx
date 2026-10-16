"use client";

import { useActionState } from "react";
import { reimportQuestions, type FormState } from "../actions";
import { btnCls, FormMessage } from "../ui";

export function ReimportForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(reimportQuestions, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Excel-এর \"✅ Final Upload\" শিট থেকে প্রশ্ন আপডেট করবেন? শিটে না থাকা প্রশ্ন বন্ধ (inactive) হয়ে যাবে।"))
          e.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      <input type="file" name="file" accept=".xlsx" required className="text-sm" />
      <button disabled={pending} className={`${btnCls} self-start`}>
        {pending ? "Import হচ্ছে…" : "Import করুন"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const inputClass =
  "h-input rounded-control border border-input bg-surface px-3.5 text-base font-normal placeholder:text-subtle";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-12 flex flex-col gap-4">
      {(state.error || notice) && (
        <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {state.error ?? notice}
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        মোবাইল নম্বর
        <input
          name="mobile"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          maxLength={16}
          required
          defaultValue={state.mobile}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-button rounded-control bg-primary text-base font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "অপেক্ষা করুন…" : "Login করুন"}
      </button>
      <p className="text-center text-sm text-muted">
        Password ভুলে গেছেন? Hadia Academy-র সাথে যোগাযোগ করুন।
      </p>
    </form>
  );
}

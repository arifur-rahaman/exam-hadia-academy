import type { Metadata } from "next";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = { title: "Login · Hadia Academy" };

// Step 1: layout only. Sign-in with mobile + password is wired up in Step 4.
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-surface px-7 pt-18 pb-8">
      <div className="flex flex-col items-center gap-3.5">
        <LogoMark size={64} />
        <div className="text-center">
          <h1 className="text-[22px] font-bold">Hadia Academy</h1>
          <p className="mt-0.5 text-sm text-muted">CBT&amp;A Level 4 · Formative Assessment</p>
        </div>
      </div>

      <form className="mt-12 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          মোবাইল নম্বর
          <input
            name="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            maxLength={14}
            className="h-input rounded-control border border-input px-3.5 text-base font-normal placeholder:text-subtle"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-input rounded-control border border-input px-3.5 text-base font-normal placeholder:text-subtle"
          />
        </label>
        <button
          type="submit"
          className="mt-2 h-button rounded-control bg-primary text-base font-semibold text-on-primary hover:bg-primary-hover"
        >
          Login করুন
        </button>
        <p className="text-center text-sm text-muted">
          Password ভুলে গেছেন? Hadia Academy-র সাথে যোগাযোগ করুন।
        </p>
      </form>

      <footer className="mt-auto flex flex-col items-center gap-3 pt-10">
        <div className="w-full border-t border-border" />
        <p className="text-sm text-muted">
          এখনো Enroll করেননি?{" "}
          <a
            href="https://hadia.academy"
            className="inline-flex min-h-touch items-center font-semibold hover:text-accent-ink"
          >
            Course-এ ভর্তি হোন
          </a>
        </p>
        <p className="text-xs text-subtle">hadia.academy · Nationally Certified Skills. Real Careers.</p>
      </footer>
    </main>
  );
}

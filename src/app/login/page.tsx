import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { getProfile, isAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Login · Hadia Academy" };

const NOTICES: Record<string, string> = {
  disabled: "এই Account বন্ধ আছে। Hadia Academy-র সাথে যোগাযোগ করুন।",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const profile = await getProfile();
  if (profile?.status === "active") redirect(isAdmin(profile) ? "/admin" : "/dashboard");
  const { reason } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-surface px-7 pt-18 pb-8">
      <div className="flex flex-col items-center gap-3.5">
        <LogoMark size={64} />
        <div className="text-center">
          <h1 className="text-[22px] font-bold">Hadia Academy</h1>
          <p className="mt-0.5 text-sm text-muted">CBT&amp;A Level 4 · Formative Assessment</p>
        </div>
      </div>

      <LoginForm notice={typeof reason === "string" ? NOTICES[reason] : undefined} />

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

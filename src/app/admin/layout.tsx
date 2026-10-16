import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Hadia Academy" };

const NAV = [
  { href: "/admin", label: "Students" },
  { href: "/admin/attempts", label: "Attempts" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/reports", label: "Reports" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const me = await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader name={me.full_name} home="/admin" />
      <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-3">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="flex min-h-touch items-center px-3 text-sm font-semibold hover:text-accent-ink">
            {n.label}
          </Link>
        ))}
        <a href="/admin/export" className="ml-auto flex min-h-touch items-center px-3 text-sm font-semibold text-accent-ink">
          Excel Export ↓
        </a>
      </nav>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5">{children}</main>
    </div>
  );
}

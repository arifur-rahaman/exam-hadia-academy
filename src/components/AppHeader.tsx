import Link from "next/link";
import { LogoMark } from "@/components/Logo";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function AppHeader({ name, home = "/dashboard" }: { name: string; home?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
      <Link href={home} className="flex min-h-touch items-center gap-2.5 font-semibold">
        <LogoMark size={28} />
        Hadia Academy
      </Link>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full border border-border text-sm font-bold"
        >
          {initials(name)}
        </span>
        <form action="/logout" method="post">
          <button type="submit" className="min-h-touch rounded-control px-2 text-sm text-muted hover:text-primary">
            Logout
          </button>
        </form>
      </div>
    </header>
  );
}

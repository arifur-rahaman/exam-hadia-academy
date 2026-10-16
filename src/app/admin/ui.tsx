import type { ReactNode } from "react";

// Shared admin table/form styling (tokens only).
export const inputCls = "h-11 rounded-control border border-input bg-surface px-3 text-sm";
export const btnCls =
  "min-h-touch rounded-control bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50";
export const btnGhostCls = "min-h-9 rounded-control border border-input bg-surface px-2.5 text-xs hover:border-accent";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      {title && <h2 className="font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-bg text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Chip({ tone, children }: { tone: "success" | "warning" | "danger" | "neutral"; children: ReactNode }) {
  const cls = {
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    neutral: "bg-chip text-muted",
  }[tone];
  return <span className={`inline-block rounded-chip px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function FormMessage({ state }: { state: { ok?: string; error?: string; details?: string[] } }) {
  if (!state.ok && !state.error) return null;
  return (
    <div className="flex flex-col gap-1 text-sm">
      {state.ok && <p className="text-success">{state.ok}</p>}
      {state.error && <p className="text-danger-text">{state.error}</p>}
      {state.details?.length ? (
        <ul className="max-h-60 overflow-auto rounded-control bg-bg p-2 text-xs">
          {state.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

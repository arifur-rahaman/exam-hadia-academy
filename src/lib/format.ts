const TZ = "Asia/Dhaka";

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function fmtScore(n: number | null | undefined) {
  if (n == null) return "—";
  return Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(1);
}

export function fmtDuration(fromIso: string, toIso: string | null) {
  if (!toIso) return "—";
  const s = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

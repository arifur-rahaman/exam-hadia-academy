import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { integrityTone, listAttempts } from "@/lib/admin/attempts";
import { fmtDateTime, fmtDuration, fmtScore } from "@/lib/format";
import { Chip, Table } from "../ui";

const RESULT = {
  competent: { tone: "success", label: "Competent" },
  nyc: { tone: "neutral", label: "Not Yet Competent" },
  pending: { tone: "warning", label: "Short বাকি" },
} as const;

export default async function AttemptsPage() {
  await requireAdmin();
  const rows = await listAttempts();
  return (
    <>
      <h1 className="text-lg font-bold">Attempts ({rows.length})</h1>
      <Table head={["Student", "Attempt", "শুরু", "সময়", "Status", "Auto", "Total", "Result", "Tab/Copy"]}>
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-bg">
            <td className="px-3 py-2.5">
              <Link href={`/admin/attempts/${r.id}`} className="font-semibold hover:text-accent-ink">
                {r.student.student_code} · {r.student.full_name}
              </Link>
            </td>
            <td className="px-3 py-2.5">#{r.attempt_no}</td>
            <td className="px-3 py-2.5 text-xs">{fmtDateTime(r.started_at)}</td>
            <td className="px-3 py-2.5 text-xs">{fmtDuration(r.started_at, r.submitted_at)}</td>
            <td className="px-3 py-2.5 text-xs">{r.status}</td>
            <td className="px-3 py-2.5">{fmtScore(r.auto_score)}</td>
            <td className="px-3 py-2.5 font-semibold">{fmtScore(r.total)}</td>
            <td className="px-3 py-2.5">
              {r.status === "in_progress" ? (
                <Chip tone="neutral">চলছে</Chip>
              ) : (
                <Chip tone={RESULT[r.result].tone}>{RESULT[r.result].label}</Chip>
              )}
            </td>
            <td className="px-3 py-2.5">
              <Chip tone={integrityTone(r.violations)}>{r.violations}</Chip>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

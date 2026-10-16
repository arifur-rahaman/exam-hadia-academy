import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { adminDb } from "@/lib/supabase/admin";
import { Chip, Table } from "../ui";
import { ReportStatusButton } from "./ReportStatusButton";

type ReportRow = {
  id: number;
  question_id: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  student: { full_name: string; student_code: string } | null;
  question: { question: string; cblm_no: number | null } | null;
};

export default async function ReportsPage() {
  await requireAdmin();
  const { data } = await adminDb()
    .from("question_reports")
    .select("id, question_id, message, status, created_at, student:profiles(full_name, student_code), question:questions(question, cblm_no)")
    .order("status", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as unknown as ReportRow[];
  return (
    <>
      <h1 className="text-lg font-bold">প্রশ্নের সমস্যা Report ({rows.filter((r) => r.status === "open").length} খোলা)</h1>
      <Table head={["কবে", "Student", "Question", "সমস্যা", "Status"]}>
        {rows.map((r) => (
          <tr key={r.id} className="align-top">
            <td className="px-3 py-2.5 text-xs whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
            <td className="px-3 py-2.5 text-xs">
              {r.student ? `${r.student.student_code} · ${r.student.full_name}` : "—"}
            </td>
            <td className="max-w-sm px-3 py-2.5">
              <div className="font-semibold">
                {r.question_id} · CBLM {r.question?.cblm_no ?? "?"}
              </div>
              <div className="text-xs text-muted">{r.question?.question}</div>
            </td>
            <td className="max-w-sm px-3 py-2.5 whitespace-pre-line">{r.message}</td>
            <td className="px-3 py-2.5">
              <div className="flex flex-col items-start gap-1.5">
                <Chip tone={r.status === "open" ? "warning" : "success"}>{r.status}</Chip>
                <ReportStatusButton id={r.id} status={r.status} />
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

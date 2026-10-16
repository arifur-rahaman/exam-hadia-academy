import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { listAttempts } from "@/lib/admin/attempts";
import { getProfile, isAdmin } from "@/lib/auth";
import { fmtDuration } from "@/lib/format";
import { displayMobile } from "@/lib/mobile";

export async function GET() {
  const me = await getProfile();
  if (!me || me.status !== "active" || !isAdmin(me)) return new NextResponse("Forbidden", { status: 403 });

  const rows = await listAttempts(10_000);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Results");
  ws.columns = [
    { header: "Student code", key: "code", width: 12 },
    { header: "Name", key: "name", width: 26 },
    { header: "Mobile", key: "mobile", width: 14 },
    { header: "Email", key: "email", width: 26 },
    { header: "Attempt", key: "no", width: 8 },
    { header: "Started (Dhaka)", key: "started", width: 18 },
    { header: "Submitted (Dhaka)", key: "submitted", width: 18 },
    { header: "Duration", key: "duration", width: 10 },
    { header: "Status", key: "status", width: 12 },
    { header: "MCQ+Matching", key: "auto", width: 13 },
    { header: "Short (self)", key: "short", width: 11 },
    { header: "Total /25", key: "total", width: 10 },
    { header: "Result", key: "result", width: 18 },
    { header: "Tab/Copy events", key: "violations", width: 14 },
  ];
  const dhaka = (iso: string | null) =>
    iso ? new Date(new Date(iso).getTime() + 6 * 3600_000).toISOString().slice(0, 16).replace("T", " ") : "";
  const label = { competent: "Competent", nyc: "Not Yet Competent", pending: "Pending (Short)" } as const;
  for (const r of rows) {
    ws.addRow({
      code: r.student.student_code,
      name: r.student.full_name,
      mobile: displayMobile(r.student.mobile),
      email: r.student.email ?? "",
      no: r.attempt_no,
      started: dhaka(r.started_at),
      submitted: dhaka(r.submitted_at),
      duration: fmtDuration(r.started_at, r.submitted_at),
      status: r.status,
      auto: r.auto_score == null ? "" : Number(r.auto_score),
      short: r.short_score == null ? "" : Number(r.short_score),
      total: r.total == null ? "" : Number(r.total),
      result: r.status === "in_progress" ? "In progress" : label[r.result],
      violations: r.violations,
    });
  }
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const date = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="hadia-exam-results-${date}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}

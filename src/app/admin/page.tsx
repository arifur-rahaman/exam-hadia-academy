import { getAssessment } from "@/lib/exam/engine";
import { fmtDateTime } from "@/lib/format";
import { displayMobile } from "@/lib/mobile";
import { adminDb } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import { AddStudentForm, CsvUploadForm, StudentRowActions } from "./StudentForms";
import { Card, Chip, Table } from "./ui";

export default async function StudentsPage({ searchParams }: PageProps<"/admin">) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.trim() : "";
  const db = adminDb();
  const a = await getAssessment();

  let query = db.from("profiles").select("*").eq("role", "student").order("created_at", { ascending: false }).limit(500);
  if (search) {
    const s = search.replace(/[%,()]/g, "");
    query = query.or(`full_name.ilike.%${s}%,mobile.ilike.%${s}%,student_code.ilike.%${s}%`);
  }
  const [{ data: students }, { data: attempts }, { data: settings }] = await Promise.all([
    query,
    db.from("attempts").select("student_id").eq("assessment_id", a.id),
    db.from("student_assessment_settings").select("student_id, extra_attempts").eq("assessment_id", a.id),
  ]);
  const used = new Map<string, number>();
  (attempts ?? []).forEach((x) => used.set(x.student_id, (used.get(x.student_id) ?? 0) + 1));
  const extra = new Map((settings ?? []).map((s) => [s.student_id as string, s.extra_attempts as number]));
  const list = (students ?? []) as Profile[];

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="নতুন Student">
          <AddStudentForm />
        </Card>
        <Card title="CSV দিয়ে অনেকজন একসাথে">
          <CsvUploadForm />
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold">Students ({list.length})</h1>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={search}
            placeholder="নাম / মোবাইল / HA-কোড"
            className="h-11 rounded-control border border-input bg-surface px-3 text-sm"
          />
          <button className="min-h-touch rounded-control border border-input bg-surface px-3 text-sm">খুঁজুন</button>
        </form>
      </div>

      <Table head={["Code", "নাম", "মোবাইল", "Status", "Attempt", "Last login", "Actions"]}>
        {list.map((s) => {
          const allowed = a.max_attempts + (extra.get(s.id) ?? 0);
          const u = used.get(s.id) ?? 0;
          return (
            <tr key={s.id} className="align-top">
              <td className="px-3 py-2.5 font-semibold">{s.student_code}</td>
              <td className="px-3 py-2.5">
                {s.full_name}
                {s.email && <div className="text-xs text-subtle">{s.email}</div>}
              </td>
              <td className="px-3 py-2.5 tabular-nums">{displayMobile(s.mobile)}</td>
              <td className="px-3 py-2.5">
                <Chip tone={s.status === "active" ? "success" : "neutral"}>{s.status}</Chip>
              </td>
              <td className="px-3 py-2.5">
                {u}/{allowed} used
              </td>
              <td className="px-3 py-2.5 text-xs">{fmtDateTime(s.last_login_at)}</td>
              <td className="px-3 py-2.5">
                <StudentRowActions id={s.id} status={s.status} />
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}

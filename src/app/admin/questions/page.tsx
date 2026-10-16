import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { CBLM_NAMES } from "@/lib/cblm";
import { adminDb } from "@/lib/supabase/admin";
import type { QuestionRow } from "@/lib/types";
import { Card, Chip, Table } from "../ui";
import { ReimportForm } from "./ReimportForm";

const PAGE = 50;

export default async function QuestionsPage({ searchParams }: PageProps<"/admin/questions">) {
  await requireAdmin();
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "";
  const cblm = typeof sp.cblm === "string" ? sp.cblm : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = adminDb();

  let query = db
    .from("questions")
    .select("id, type, cblm_no, question, answer_key, model_answer, is_ff, active, cblm_page, cblm_page_reviewed", {
      count: "exact",
    })
    .order("id")
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (["mcq", "matching", "short"].includes(type)) query = query.eq("type", type);
  if (cblm) query = query.eq("cblm_no", Number(cblm));
  if (q) query = query.ilike("question", `%${q.replace(/[%_]/g, "")}%`);

  const [{ data, count }, { data: all }] = await Promise.all([query, db.from("questions").select("type, active, is_ff")]);
  const rows = (data ?? []) as QuestionRow[];
  const stat = (t: string) => (all ?? []).filter((x) => x.type === t && x.active);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (p: number) => new URLSearchParams({ type, cblm, q, page: String(p) }).toString();

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Question bank (active)">
          <div className="flex flex-wrap gap-2 text-sm">
            {(["mcq", "matching", "short"] as const).map((t) => (
              <Chip key={t} tone="neutral">
                {t.toUpperCase()}: {stat(t).length} (★ {stat(t).filter((x) => x.is_ff).length})
              </Chip>
            ))}
          </div>
          <p className="text-xs text-muted">শুধু দেখার জন্য। প্রশ্ন বদলাতে Excel-এ ঠিক করে আবার Import করুন।</p>
        </Card>
        <Card title="Excel থেকে আবার Import">
          <ReimportForm />
        </Card>
      </div>

      <form className="flex flex-wrap gap-2">
        <select name="type" defaultValue={type} className="h-11 rounded-control border border-input bg-surface px-2 text-sm">
          <option value="">সব ধরন</option>
          <option value="mcq">MCQ</option>
          <option value="matching">Matching</option>
          <option value="short">Short</option>
        </select>
        <select name="cblm" defaultValue={cblm} className="h-11 rounded-control border border-input bg-surface px-2 text-sm">
          <option value="">সব CBLM</option>
          {Object.entries(CBLM_NAMES).map(([n, name]) => (
            <option key={n} value={n}>
              {n}. {name}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="প্রশ্নে খুঁজুন" className="h-11 rounded-control border border-input bg-surface px-3 text-sm" />
        <button className="min-h-touch rounded-control border border-input bg-surface px-3 text-sm">Filter</button>
      </form>

      <Table head={["ID", "CBLM", "প্রশ্ন", "Answer", "★", "Active"]}>
        {rows.map((r) => (
          <tr key={r.id} className="align-top">
            <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{r.id}</td>
            <td className="px-3 py-2.5">
              {r.cblm_no}
              {r.cblm_page && (
                <div className="text-xs text-subtle">
                  p.{r.cblm_page} {r.cblm_page_reviewed ? "✓" : "(unreviewed)"}
                </div>
              )}
            </td>
            <td className="max-w-md px-3 py-2.5 whitespace-pre-line">{r.question}</td>
            <td className="max-w-xs px-3 py-2.5 text-xs whitespace-pre-line text-muted">
              {r.type === "short" ? r.model_answer?.slice(0, 160) : r.answer_key}
            </td>
            <td className="px-3 py-2.5">{r.is_ff ? "★" : ""}</td>
            <td className="px-3 py-2.5">{r.active ? "✓" : <Chip tone="neutral">off</Chip>}</td>
          </tr>
        ))}
      </Table>

      <div className="flex items-center gap-3 text-sm">
        {page > 1 && <Link href={`?${qs(page - 1)}`}>‹ আগের</Link>}
        <span className="text-muted">
          Page {page}/{pages} · {count ?? 0}টি
        </span>
        {page < pages && <Link href={`?${qs(page + 1)}`}>পরের ›</Link>}
      </div>
    </>
  );
}

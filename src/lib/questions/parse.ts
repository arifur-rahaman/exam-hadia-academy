// Parses and validates the "✅ Final Upload" sheet of CBTA_L4_Question_Bank.xlsx (see docs/DATA.md).
// Shared by scripts/import-questions.ts and the admin re-import page. No server-only imports here.
import ExcelJS from "exceljs";

export const FINAL_SHEET = "✅ Final Upload";

export type QuestionType = "mcq" | "matching" | "short";

export type ParsedQuestion = {
  id: string;
  type: QuestionType;
  cblm_no: number;
  question: string;
  options: Record<string, string> | string[] | null;
  answer_key: string | null;
  model_answer: string | null;
  is_ff: boolean;
  source: string | null;
};

export type ParseIssue = { row: number; id: string; problem: string };

export type ParseResult = {
  questions: ParsedQuestion[];
  failures: ParseIssue[]; // skipped rows
  warnings: ParseIssue[]; // imported, but worth a look
};

const TYPE_MAP: Record<string, QuestionType> = { MCQ: "mcq", Matching: "matching", Short: "short" };
const ID_PREFIX: Record<QuestionType, string> = { mcq: "MCQ", matching: "MAT", short: "SQ" };
const LETTERS = ["A", "B", "C", "D"] as const;

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v && v.result != null) return cellText(v.result as ExcelJS.CellValue);
  }
  return "";
}

// Trim, unify line breaks, drop control characters; keep Bangla/Unicode.
export function clean(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Loose compare for "answer text equals option text" checks.
export function same(a: string, b: string): boolean {
  const n = (s: string) => clean(s).replace(/\s+/g, " ").replace(/[.。]+$/, "").toLowerCase();
  return n(a) === n(b);
}

export async function parseQuestionBank(data: ArrayBuffer | Buffer): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as ArrayBuffer);
  const ws = wb.getWorksheet(FINAL_SHEET);
  if (!ws) throw new Error(`Sheet "${FINAL_SHEET}" not found in the Excel file.`);

  const res: ParseResult = { questions: [], failures: [], warnings: [] };
  const seen = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const col = (c: number) => clean(cellText(row.getCell(c).value));
    const id = col(1);
    if (!id && !col(4)) continue; // blank row
    const fail = (problem: string) => res.failures.push({ row: r, id: id || "(no ID)", problem });
    const warn = (problem: string) => res.warnings.push({ row: r, id, problem });

    const type = TYPE_MAP[col(2)];
    if (!type) {
      fail(`unknown type "${col(2)}"`);
      continue;
    }
    if (!new RegExp(`^${ID_PREFIX[type]}-\\d+$`).test(id)) {
      fail(`ID "${id}" does not match type ${col(2)}`);
      continue;
    }
    if (seen.has(id)) {
      fail("duplicate ID");
      continue;
    }
    const cblm = Number(/^\s*(\d{1,2})\s*\./.exec(col(3))?.[1]);
    if (!(cblm >= 1 && cblm <= 12)) {
      fail(`CBLM number not found in "${col(3)}"`);
      continue;
    }
    const question = col(4);
    if (!question) {
      fail("empty question");
      continue;
    }

    const q: ParsedQuestion = {
      id,
      type,
      cblm_no: cblm,
      question,
      options: null,
      answer_key: null,
      model_answer: null,
      is_ff: /final formative/i.test(col(13)),
      source: col(14) || null,
    };

    if (type === "mcq") {
      const opts = Object.fromEntries(LETTERS.map((L, i) => [L, col(5 + i)]));
      const letter = col(9).toUpperCase();
      if (LETTERS.some((L) => !opts[L])) {
        fail("MCQ needs 4 options (A–D)");
        continue;
      }
      if (!LETTERS.includes(letter as (typeof LETTERS)[number])) {
        fail(`correct letter "${col(9)}" is not A–D`);
        continue;
      }
      if (col(10) && !same(opts[letter], col(10))) {
        fail(`answer text "${col(10)}" ≠ option ${letter} "${opts[letter]}"`);
        continue;
      }
      if (new Set(LETTERS.map((L) => opts[L].toLowerCase())).size < 4) warn("two MCQ options are identical");
      q.options = opts;
      q.answer_key = letter;
    } else if (type === "matching") {
      const list = col(11)
        .split(/\s*\|\s*/)
        .map((s) => clean(s.replace(/^[A-Z]\)\s*/, "")))
        .filter(Boolean);
      const answer = col(10);
      if (list.length < 2) {
        fail("Matching needs an option list");
        continue;
      }
      const hit = list.find((o) => same(o, answer));
      if (!answer || !hit) {
        fail(`answer "${answer}" is not in its option list`);
        continue;
      }
      if (list.filter((o) => same(o, answer)).length > 1) warn("answer appears twice in option list");
      q.options = list;
      q.answer_key = hit;
    } else {
      if (!col(12)) {
        const raw = row.getCell(12).value;
        const isFormula = typeof raw === "object" && raw != null && "formula" in raw;
        fail(
          isFormula
            ? "model answer cell is saved as an Excel formula (starts with = or -), so it shows an error; retype it with ' in front"
            : "Short has no model answer",
        );
        continue;
      }
      q.model_answer = col(12);
    }

    seen.add(id);
    res.questions.push(q);
  }
  return res;
}

export function summarize(qs: ParsedQuestion[]) {
  const byType = { mcq: 0, matching: 0, short: 0 };
  const ffByType = { mcq: 0, matching: 0, short: 0 };
  const byCblm: Record<number, { mcq: number; matching: number; short: number }> = {};
  for (const q of qs) {
    byType[q.type]++;
    if (q.is_ff) ffByType[q.type]++;
    byCblm[q.cblm_no] ??= { mcq: 0, matching: 0, short: 0 };
    byCblm[q.cblm_no][q.type]++;
  }
  return { total: qs.length, byType, ffByType, byCblm };
}

export function reportMarkdown(res: ParseResult, title = "Question import report"): string {
  const s = summarize(res.questions);
  const lines = [
    `# ${title}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Imported: **${s.total}** — MCQ ${s.byType.mcq}, Matching ${s.byType.matching}, Short ${s.byType.short}`,
    `★ Final Formative: MCQ ${s.ffByType.mcq}, Matching ${s.ffByType.matching}, Short ${s.ffByType.short}`,
    `Skipped (failed validation): **${res.failures.length}**`,
    "",
    "## By CBLM",
    "",
    "| CBLM | MCQ | Matching | Short |",
    "|---|---|---|---|",
    ...Object.entries(s.byCblm)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([k, v]) => `| ${k} | ${v.mcq} | ${v.matching} | ${v.short} |`),
    "",
    "## Skipped rows",
    "",
    ...(res.failures.length
      ? ["| Row | ID | Problem |", "|---|---|---|", ...res.failures.map((f) => `| ${f.row} | ${f.id} | ${f.problem.replace(/\|/g, "\\|")} |`)]
      : ["None."]),
    "",
    "## Warnings (imported)",
    "",
    ...(res.warnings.length
      ? ["| Row | ID | Note |", "|---|---|---|", ...res.warnings.map((f) => `| ${f.row} | ${f.id} | ${f.problem} |`)]
      : ["None."]),
    "",
  ];
  return lines.join("\n");
}

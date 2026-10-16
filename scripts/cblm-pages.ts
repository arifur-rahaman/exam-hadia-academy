// Proposes a CBLM page for every Short question by matching its question + model answer
// against the text of its CBLM PDF. Output is a PROPOSAL for Arif to check:
// scripts/out/short-cblm-pages.xlsx. Nothing is written to the database.
// Usage: npm run cblm:pages
import ExcelJS from "exceljs";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseQuestionBank } from "../src/lib/questions/parse";

const ROOT = path.resolve(process.cwd(), "..");
const CBLM_DIR = path.join(ROOT, "CBLM");
const EXCEL = path.join(ROOT, "Final Questions for online assessment", "CBTA_L4_Question_Bank.xlsx");
const OUT = path.join(process.cwd(), "scripts", "out", "short-cblm-pages.xlsx");

const STOP = new Set(
  "the a an and or of to in on for is are be by with as at that this it its from which what write down four three two five six any must should can will their they there these those your you about into than then how why when who whom does do not".split(
    " ",
  ),
);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

async function pdfPages(file: string): Promise<string[]> {
  const task = getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" ").replace(/\s+/g, " "));
  }
  await task.destroy();
  return pages;
}

// Printed page number in the footer/header ("Page 6 of 40", "- 6 -"), if any.
function printedPage(text: string): string | null {
  const m = /page\s*(?:no\.?\s*)?(\d{1,3})\s*(?:of\s*\d+)?/i.exec(text) ?? /(?:^|\s)-\s*(\d{1,3})\s*-(?:\s|$)/.exec(text);
  return m ? m[1] : null;
}

function snippet(text: string, words: Set<string>): string {
  const parts = text.split(/(?<=[.;:!?])\s+/);
  let best = "";
  let bestScore = -1;
  for (const p of parts) {
    const sc = tokens(p).filter((w) => words.has(w)).length;
    if (sc > bestScore) {
      bestScore = sc;
      best = p;
    }
  }
  return best.slice(0, 300);
}

async function main() {
  const { questions } = await parseQuestionBank(readFileSync(EXCEL));
  const shorts = questions.filter((q) => q.type === "short");
  const files = readdirSync(CBLM_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));

  const books = new Map<number, { pages: string[]; df: Map<string, number>; tok: Set<string>[] }>();
  for (const f of files) {
    const no = Number(/^(\d+)\./.exec(f)?.[1]);
    if (!no) continue;
    const pages = await pdfPages(path.join(CBLM_DIR, f));
    const tok = pages.map((p) => new Set(tokens(p)));
    const df = new Map<string, number>();
    tok.forEach((t) => t.forEach((w) => df.set(w, (df.get(w) ?? 0) + 1)));
    books.set(no, { pages, df, tok });
    const empty = pages.filter((p) => p.trim().length < 30).length;
    console.log(`CBLM ${no}: ${pages.length} pages${empty ? ` (${empty} with no text — maybe scanned)` : ""}`);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Short → CBLM page");
  ws.columns = [
    { header: "ID", key: "id", width: 9 },
    { header: "CBLM", key: "cblm", width: 6 },
    { header: "Question", key: "q", width: 50 },
    { header: "Proposed PDF page", key: "page", width: 10 },
    { header: "Printed page no. (if found)", key: "printed", width: 12 },
    { header: "Other candidate pages", key: "alt", width: 14 },
    { header: "Confidence", key: "conf", width: 11 },
    { header: "Matching text in CBLM", key: "snip", width: 60 },
    { header: "Arif: correct page", key: "arifPage", width: 12 },
    { header: "Arif: OK? (✅/❌)", key: "arifOk", width: 12 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const tally = { high: 0, medium: 0, low: 0, none: 0 };
  for (const q of shorts) {
    const book = books.get(q.cblm_no);
    if (!book) {
      tally.none++;
      ws.addRow({ id: q.id, cblm: q.cblm_no, q: q.question, conf: "no PDF text" });
      continue;
    }
    const words = new Set(tokens(`${q.question} ${q.model_answer ?? ""}`));
    const n = book.pages.length;
    const scored = book.tok
      .map((t, i) => {
        let s = 0;
        words.forEach((w) => {
          if (t.has(w)) s += Math.log(1 + n / (book.df.get(w) ?? 1));
        });
        return { page: i + 1, s };
      })
      .sort((a, b) => b.s - a.s);
    const [top, second] = scored;
    const ratio = second?.s ? top.s / second.s : 2;
    const conf = top.s < 5 ? "low" : ratio >= 1.35 ? "high" : ratio >= 1.12 ? "medium" : "low";
    tally[conf]++;
    ws.addRow({
      id: q.id,
      cblm: q.cblm_no,
      q: q.question,
      page: top.s > 0 ? top.page : "",
      printed: printedPage(book.pages[top.page - 1]) ?? "",
      alt: scored
        .slice(1, 4)
        .filter((x) => x.s > top.s * 0.7)
        .map((x) => x.page)
        .join(", "),
      conf,
      snip: snippet(book.pages[top.page - 1], words),
    });
  }
  ws.eachRow((r) => (r.alignment = { wrapText: true, vertical: "top" }));

  const info = wb.addWorksheet("পড়ুন");
  [
    "এটি শুধু প্রস্তাব (proposal)। কম্পিউটার শব্দ মিলিয়ে পেজ অনুমান করেছে — ভুল হতে পারে।",
    "Proposed PDF page = PDF ফাইলের পেজ নম্বর (PDF viewer-এ যেটা দেখায়)। ছাপা পেজ নম্বর আলাদা হতে পারে।",
    "প্রতিটি লাইনে 'Arif: correct page' কলামে সঠিক পেজ লিখুন, আর 'Arif: OK?' কলামে ✅ দিন।",
    "আপনি দেখে ✅ দেওয়ার আগে Result পেজে কোনো Page নম্বর দেখানো হবে না।",
    `Confidence: high ${tally.high}, medium ${tally.medium}, low ${tally.low}, no PDF ${tally.none}`,
  ].forEach((l) => info.addRow([l]));
  info.getColumn(1).width = 110;

  mkdirSync(path.dirname(OUT), { recursive: true });
  await wb.xlsx.writeFile(OUT);
  console.log(`Wrote ${OUT}`);
  console.log(`Confidence: high ${tally.high}, medium ${tally.medium}, low ${tally.low}, no PDF ${tally.none}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

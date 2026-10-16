// Reads the question bank Excel (read-only), validates it, writes scripts/out/questions.json
// and scripts/out/import-report.md. With --apply it also upserts into Supabase.
// Usage: npm run import:questions            (dry run, no database needed)
//        npm run import:questions -- --apply
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseQuestionBank, reportMarkdown, summarize } from "../src/lib/questions/parse";
import { syncQuestions } from "../src/lib/questions/sync";
import { requireEnv } from "./lib/env";

const EXCEL = path.resolve(
  process.cwd(),
  "..",
  "Final Questions for online assessment",
  "CBTA_L4_Question_Bank.xlsx",
);
const OUT = path.join(process.cwd(), "scripts", "out");
const EXPECTED = { mcq: 272, matching: 89, short: 282 };

async function main() {
  const res = await parseQuestionBank(readFileSync(EXCEL));
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "questions.json"), JSON.stringify(res.questions, null, 2));
  writeFileSync(path.join(OUT, "import-report.md"), reportMarkdown(res));

  const s = summarize(res.questions);
  console.log(`Parsed ${s.total}: MCQ ${s.byType.mcq}, Matching ${s.byType.matching}, Short ${s.byType.short}`);
  console.log(`FF: MCQ ${s.ffByType.mcq}, Matching ${s.ffByType.matching}, Short ${s.ffByType.short}`);
  console.log(`Skipped ${res.failures.length}, warnings ${res.warnings.length}. Report: scripts/out/import-report.md`);
  const countsOk = (Object.keys(EXPECTED) as (keyof typeof EXPECTED)[]).every((k) => s.byType[k] === EXPECTED[k]);
  if (!countsOk) console.warn(`WARNING: expected ${JSON.stringify(EXPECTED)}`);

  if (process.argv.includes("--apply")) {
    const db = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const r = await syncQuestions(db, "CBTA-L4", res.questions);
    console.log(`Supabase: upserted ${r.upserted}, deactivated ${r.deactivated}`);
  } else {
    console.log("Dry run. Add --apply to write to Supabase.");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

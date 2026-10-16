// Loads Arif-reviewed CBLM pages into Supabase. Only rows with ✅ in "Arif: OK?" are used;
// "Arif: correct page" wins over the proposal. Marks them cblm_page_reviewed = true.
// Usage: npm run cblm:apply -- [path-to-reviewed.xlsx]   (default: scripts/out/short-cblm-pages.xlsx)
import ExcelJS from "exceljs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./lib/env";

async function main() {
  const file = path.resolve(process.argv[2] ?? path.join("scripts", "out", "short-cblm-pages.xlsx"));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const head = (ws.getRow(1).values as unknown[]).map((v) => String(v ?? ""));
  const col = (name: string) => head.findIndex((h) => h.startsWith(name));
  const [cId, cPage, cArif, cOk] = [col("ID"), col("Proposed PDF page"), col("Arif: correct page"), col("Arif: OK?")];

  const updates: { id: string; page: string }[] = [];
  ws.eachRow((r, i) => {
    if (i === 1) return;
    const v = r.values as unknown[];
    if (!String(v[cOk] ?? "").includes("✅")) return;
    const page = String(v[cArif] ?? "").trim() || String(v[cPage] ?? "").trim();
    if (page) updates.push({ id: String(v[cId]), page });
  });
  console.log(`${updates.length} reviewed rows in ${file}`);

  const db = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  for (const u of updates) {
    const { error } = await db.from("questions").update({ cblm_page: u.page, cblm_page_reviewed: true }).eq("id", u.id);
    if (error) console.error(u.id, error.message);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

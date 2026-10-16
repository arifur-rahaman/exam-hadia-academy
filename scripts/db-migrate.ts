// Applies supabase/migrations/*.sql to the Supabase database once each, in order.
// Needs SUPABASE_DB_URL in .env.local (Supabase → Connect → Session pooler URI).
// Usage: npm run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { requireEnv } from "./lib/env";

async function main() {
  const client = new Client({
    connectionString: requireEnv("SUPABASE_DB_URL"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(`
      create schema if not exists app_meta;
      create table if not exists app_meta.migrations (
        name text primary key, applied_at timestamptz not null default now()
      );`);
    const done = new Set(
      (await client.query<{ name: string }>("select name from app_meta.migrations")).rows.map((r) => r.name),
    );
    const dir = path.join(process.cwd(), "supabase", "migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      if (done.has(f)) {
        console.log("skip   ", f);
        continue;
      }
      await client.query("begin");
      try {
        await client.query(readFileSync(path.join(dir, f), "utf8"));
        await client.query("insert into app_meta.migrations (name) values ($1)", [f]);
        await client.query("commit");
        console.log("applied", f);
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

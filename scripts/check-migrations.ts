// Runs all migrations against an in-memory Postgres (PGlite) with a stub `auth` schema,
// then checks RLS: a student sees only their own rows and never `questions`.
// Usage: npm run db:check
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "supabase", "migrations");

const AUTH_STUB = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

async function main() {
  const db = new PGlite();
  await db.exec(AUTH_STUB);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, f), "utf8"));
    console.log("applied", f);
  }
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select on all tables in schema public to anon, authenticated;
  `);

  const a = "00000000-0000-0000-0000-00000000000a";
  const b = "00000000-0000-0000-0000-00000000000b";
  await db.exec(`
    insert into auth.users (id) values ('${a}'), ('${b}');
    insert into public.profiles (id, full_name, mobile) values
      ('${a}', 'A', '+8801711111111'), ('${b}', 'B', '+8801811111111');
    insert into public.questions (id, course_id, type, question, options, answer_key)
      select 'MCQ-T', id, 'mcq', 'q', '{"A":"a","B":"b","C":"c","D":"d"}', 'B' from public.courses;
    insert into public.attempts (student_id, assessment_id, attempt_no, deadline_at)
      select '${a}', id, 1, now() + interval '1 hour' from public.assessments;
    insert into public.attempt_questions (attempt_id, position, question_id, is_correct)
      select id, 1, 'MCQ-T', true from public.attempts;
  `);

  const codes = await db.query<{ student_code: string }>(
    "select student_code from public.profiles order by student_code",
  );
  check("student codes", codes.rows.map((r) => r.student_code).join(",") === "HA-0001,HA-0002");

  let bad = false;
  try {
    await db.exec(`insert into public.profiles (id, full_name, mobile) values ('${b}', 'x', '01711111111')`);
  } catch {
    bad = true;
  }
  check("mobile format enforced", bad);

  const asStudent = async (uid: string, sql: string) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
    try {
      return (await db.query(sql)).rows.length;
    } finally {
      await db.exec("reset role;");
    }
  };
  check("A sees own profile only", (await asStudent(a, "select * from public.profiles")) === 1);
  check("A sees own attempt", (await asStudent(a, "select * from public.attempts")) === 1);
  check("B sees no attempts of A", (await asStudent(b, "select * from public.attempts")) === 0);
  check("questions hidden from students", (await asStudent(a, "select * from public.questions")) === 0);
  check(
    "answer rows hidden while exam running",
    (await asStudent(a, "select * from public.attempt_questions")) === 0,
  );
  await db.exec("update public.attempts set status = 'submitted'");
  check(
    "answer rows visible after submit",
    (await asStudent(a, "select * from public.attempt_questions")) === 1,
  );
  check("assessments readable", (await asStudent(a, "select * from public.assessments")) === 1);

  let dup = false;
  try {
    await db.exec(`update public.attempts set status = 'in_progress';
      insert into public.attempts (student_id, assessment_id, attempt_no, deadline_at)
      select '${a}', id, 2, now() from public.assessments;`);
  } catch {
    dup = true;
  }
  check("only one running attempt", dup);
  console.log(failures ? `${failures} check(s) FAILED` : "all checks passed");
  process.exit(failures ? 1 : 0);
}

let failures = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) failures++;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

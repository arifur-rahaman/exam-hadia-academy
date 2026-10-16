import assert from "node:assert/strict";
import { test } from "node:test";
import { isCorrect, normalizeAnswer, optionOrder, pickQuestions, score } from "../src/lib/exam/logic";
import { maskMobile, mobileToAuthEmail, normalizeMobile } from "../src/lib/mobile";
import { parseCsv } from "../src/lib/admin/csv";

const pool = (prefix: string, n: number, ff: boolean) =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, is_ff: ff }));

test("pickQuestions takes ~60% FF, no duplicates", () => {
  const p = [...pool("F", 50, true), ...pool("N", 50, false)];
  const ids = pickQuestions(p, 10, new Set());
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
  assert.equal(ids.filter((id) => id.startsWith("F")).length, 6);
});

test("pickQuestions prefers unseen questions", () => {
  const p = [...pool("F", 12, true), ...pool("N", 12, false)];
  const seen = new Set([...pool("F", 6, true), ...pool("N", 6, false)].map((q) => q.id));
  for (let i = 0; i < 20; i++) {
    const ids = pickQuestions(p, 10, seen);
    assert.ok(ids.every((id) => !seen.has(id)));
  }
});

test("pickQuestions fills from seen when pool is small", () => {
  const p = pool("F", 10, true);
  const ids = pickQuestions(p, 10, new Set(p.slice(0, 8).map((q) => q.id)));
  assert.equal(new Set(ids).size, 10);
});

test("pickQuestions with only FF (matching pool)", () => {
  assert.equal(pickQuestions(pool("M", 89, true), 5, new Set()).length, 5);
});

test("two students get different selections/orders", () => {
  const p = [...pool("F", 147, true), ...pool("N", 125, false)];
  const a = pickQuestions(p, 10, new Set()).join();
  const b = pickQuestions(p, 10, new Set()).join();
  assert.notEqual(a, b);
  assert.deepEqual([...(optionOrder("mcq", null) as string[])].sort(), ["A", "B", "C", "D"]);
});

test("answers are validated and checked", () => {
  const mcq = { A: "a", B: "b", C: "c", D: "d" };
  assert.equal(normalizeAnswer("mcq", mcq, "E"), null);
  assert.equal(isCorrect("mcq", mcq, "B", normalizeAnswer("mcq", mcq, "B")), true);
  const m = ["x", "y", "z"];
  assert.equal(normalizeAnswer("matching", m, 5), null);
  assert.equal(isCorrect("matching", m, "z", 2), true);
  assert.equal(isCorrect("matching", m, "z", 0), false);
  assert.equal(isCorrect("short", null, null, "t"), null);
});

test("score: pending until all shorts marked; 20/25 is Competent", () => {
  const rows = [
    ...Array.from({ length: 15 }, () => ({ type: "mcq" as const, is_correct: true, self_mark: null })),
    ...Array.from({ length: 10 }, () => ({ type: "short" as const, is_correct: null, self_mark: null })),
  ];
  assert.equal(score(rows, 20).result, "pending");
  const marked = rows.map((r, i) =>
    r.type === "short" ? { ...r, self_mark: (i < 20 ? "full" : i < 24 ? "partial" : "none") as "full" | "partial" | "none" } : r,
  );
  const s = score(marked, 20);
  assert.equal(s.total, 15 + 5 + 4 * 0.5);
  assert.equal(s.result, "competent");
  const low = marked.map((r) => (r.type === "short" ? { ...r, self_mark: "partial" as const } : r));
  assert.equal(score(low, 20).total, 20);
  assert.equal(score(low, 20).result, "competent");
  assert.equal(score(marked.map((r) => (r.type === "short" ? { ...r, self_mark: "none" as const } : r)), 20).result, "nyc");
});

test("mobile normalisation", () => {
  for (const v of ["01712345678", "+8801712345678", "8801712345678", "017-1234-5678", "1712345678"]) {
    assert.equal(normalizeMobile(v), "+8801712345678");
  }
  assert.equal(normalizeMobile("01212345678"), null);
  assert.equal(normalizeMobile("0171234567"), null);
  assert.equal(maskMobile("+8801712345245"), "017••-•••245");
  assert.equal(mobileToAuthEmail("+8801712345678"), "8801712345678@students.hadia.academy");
});

test("csv parsing", () => {
  const rows = parseCsv('﻿name,mobile,email,password\r\n"Rahim, Uddin",01712345678,,secret123\n\nKarim,01812345678,k@x.com,"pa""ss1234"\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Rahim, Uddin");
  assert.equal(rows[1].password, 'pa"ss1234');
});

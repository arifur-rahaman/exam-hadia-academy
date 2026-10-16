// Pure exam rules (no database): selection, shuffling, answer checking, scoring.
import { randomInt } from "node:crypto";
import { FF_RATIO, MCQ_LETTERS, SELF_MARK_POINTS } from "./config";
import type { QuestionType, SelfMark } from "@/lib/types";

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type PoolItem = { id: string; is_ff: boolean };

// Picks n questions: ~FF_RATIO from ★ Final Formative, preferring ones the student has not seen.
export function pickQuestions(pool: PoolItem[], n: number, seen: Set<string>, ffRatio = FF_RATIO): string[] {
  const split = (ff: boolean, unseen: boolean) =>
    shuffle(pool.filter((q) => q.is_ff === ff && !seen.has(q.id) === unseen));
  const ffTarget = Math.round(n * ffRatio);
  const picked: string[] = [];
  const take = (list: PoolItem[], max: number) => {
    for (const q of list) {
      if (picked.length >= n || max <= 0) break;
      if (!picked.includes(q.id)) {
        picked.push(q.id);
        max--;
      }
    }
  };
  const ffUnseen = split(true, true);
  const nonUnseen = split(false, true);
  take(ffUnseen, ffTarget);
  take(nonUnseen, n - picked.length);
  // Not enough on one side → fill from the other, then from already-seen questions.
  take(ffUnseen, n - picked.length);
  take(split(true, false), Math.max(0, ffTarget - picked.length));
  take(shuffle([...split(true, false), ...split(false, false)]), n - picked.length);
  return shuffle(picked);
}

export function optionOrder(type: QuestionType, options: unknown): string[] | number[] | null {
  if (type === "mcq") return shuffle(MCQ_LETTERS);
  if (type === "matching" && Array.isArray(options)) return shuffle(options.map((_, i) => i));
  return null;
}

// Validates a submitted answer for the question type; returns the stored value or null if invalid.
export function normalizeAnswer(
  type: QuestionType,
  options: Record<string, string> | string[] | null,
  raw: unknown,
): string | number | null {
  if (type === "mcq") {
    return typeof raw === "string" && (MCQ_LETTERS as readonly string[]).includes(raw) ? raw : null;
  }
  if (type === "matching") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return Array.isArray(options) && Number.isInteger(n) && n >= 0 && n < options.length ? n : null;
  }
  return typeof raw === "string" ? raw : null;
}

export function isCorrect(
  type: QuestionType,
  options: Record<string, string> | string[] | null,
  answerKey: string | null,
  answer: string | number | null,
): boolean | null {
  if (type === "short") return null;
  if (answer == null) return false;
  if (type === "mcq") return answer === answerKey;
  return Array.isArray(options) && options[answer as number] === answerKey;
}

export type ScoreRow = { type: QuestionType; is_correct: boolean | null; self_mark: SelfMark | null };

export function score(rows: ScoreRow[], passMark: number) {
  const auto = rows.filter((r) => r.type !== "short" && r.is_correct).length;
  const shorts = rows.filter((r) => r.type === "short");
  const shortScore = shorts.reduce((s, r) => s + (r.self_mark ? SELF_MARK_POINTS[r.self_mark] : 0), 0);
  const allMarked = shorts.every((r) => r.self_mark != null);
  const total = allMarked ? auto + shortScore : null;
  const result = total == null ? "pending" : total >= passMark ? "competent" : "nyc";
  return {
    auto_score: auto,
    short_score: shortScore,
    total,
    result: result as "pending" | "competent" | "nyc",
    shortsMarked: shorts.filter((r) => r.self_mark != null).length,
    shortsTotal: shorts.length,
  };
}

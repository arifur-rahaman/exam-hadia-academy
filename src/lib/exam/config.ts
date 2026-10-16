// Phase 1 exam constants (see docs/PLAN.md §1).
export const ASSESSMENT_CODE = "FULL_FF";
export const COURSE_CODE = "CBTA-L4";

// Share of each question type drawn from ★ Final Formative questions when available.
export const FF_RATIO = 0.6;

// Short self-mark points. 0.5 for "আংশিক" is a proposal — confirm with Arif.
export const SELF_MARK_POINTS = { full: 1, partial: 0.5, none: 0 } as const;

// Network allowance for an answer sent right at the deadline.
export const ANSWER_GRACE_MS = 5_000;

export const MAX_SHORT_ANSWER_CHARS = 5_000;
export const MAX_VIOLATIONS_PER_ATTEMPT = 1_000;

export const MCQ_LETTERS = ["A", "B", "C", "D"] as const;

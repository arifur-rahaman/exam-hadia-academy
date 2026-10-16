export type Role = "student" | "admin" | "super_admin" | "center_admin";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  mobile: string;
  email: string | null;
  student_code: string;
  center_id: string | null;
  status: "active" | "disabled";
  last_login_at: string | null;
  created_at: string;
};

export type Assessment = {
  id: string;
  course_id: string;
  code: string;
  title: string;
  mcq_count: number;
  matching_count: number;
  short_count: number;
  duration_min: number;
  pass_mark: number;
  max_attempts: number;
  active: boolean;
};

export type AttemptStatus = "in_progress" | "submitted" | "expired";
export type AttemptResult = "pending" | "competent" | "nyc";

export type Attempt = {
  id: string;
  student_id: string;
  assessment_id: string;
  attempt_no: number;
  started_at: string;
  deadline_at: string;
  submitted_at: string | null;
  status: AttemptStatus;
  current_position: number;
  auto_score: number | null;
  short_score: number | null;
  total: number | null;
  result: AttemptResult;
};

export type QuestionType = "mcq" | "matching" | "short";
export type SelfMark = "full" | "partial" | "none";

export type QuestionRow = {
  id: string;
  type: QuestionType;
  cblm_no: number | null;
  question: string;
  options: Record<string, string> | string[] | null;
  answer_key: string | null;
  model_answer: string | null;
  cblm_page: string | null;
  cblm_page_reviewed: boolean;
  is_ff: boolean;
  active: boolean;
};

export type AttemptQuestion = {
  id: string;
  attempt_id: string;
  position: number;
  question_id: string;
  option_order: string[] | number[] | null;
  answer: string | number | null;
  answered_at: string | null;
  is_correct: boolean | null;
  self_mark: SelfMark | null;
};

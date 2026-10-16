-- Phase 1 schema: courses, profiles, questions, assessments, attempts, attempt_questions,
-- violations, question_reports, student_assessment_settings.
-- Rule: the browser never reads `questions`; all exam actions run on the server with the service role.

-- ---------------------------------------------------------------- courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- profiles
create sequence public.student_code_seq;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student'
    check (role in ('student', 'admin', 'super_admin', 'center_admin')),
  full_name text not null,
  mobile text not null unique check (mobile ~ '^\+8801[3-9][0-9]{8}$'),
  email text,
  student_code text not null unique
    default ('HA-' || lpad(nextval('public.student_code_seq')::text, 4, '0')),
  center_id uuid,
  status text not null default 'active' check (status in ('active', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- questions
create table public.questions (
  id text primary key, -- 'MCQ-001' etc. from the Excel, stable across re-imports
  course_id uuid not null references public.courses (id),
  type text not null check (type in ('mcq', 'matching', 'short')),
  cblm_no int check (cblm_no between 1 and 12),
  question text not null,
  options jsonb, -- mcq: {"A":..,"B":..,"C":..,"D":..}; matching: ["..", ..]
  answer_key text, -- mcq: letter; matching: correct option text
  model_answer text, -- short
  cblm_page text,
  cblm_page_reviewed boolean not null default false, -- show page only after Arif reviews it
  is_ff boolean not null default false,
  source text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index questions_pool_idx on public.questions (course_id, type, active, is_ff);

-- ---------------------------------------------------------------- assessments
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id),
  code text not null unique,
  title text not null,
  mcq_count int not null default 10,
  matching_count int not null default 5,
  short_count int not null default 10,
  duration_min int not null default 60,
  pass_mark numeric(5, 2) not null default 20,
  max_attempts int not null default 3,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Per-student attempt allowance on top of assessments.max_attempts (admin reset / raise).
create table public.student_assessment_settings (
  student_id uuid not null references public.profiles (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  extra_attempts int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, assessment_id)
);

-- ---------------------------------------------------------------- attempts
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id),
  attempt_no int not null,
  center_id uuid,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'expired')),
  current_position int not null default 1,
  auto_score numeric(5, 2),
  short_score numeric(5, 2),
  total numeric(5, 2),
  result text not null default 'pending' check (result in ('pending', 'competent', 'nyc')),
  unique (student_id, assessment_id, attempt_no)
);
-- At most one running attempt per student per assessment (guards double-click "Start").
create unique index attempts_one_running_idx
  on public.attempts (student_id, assessment_id) where status = 'in_progress';
create index attempts_student_idx on public.attempts (student_id, started_at desc);

-- ---------------------------------------------------------------- attempt_questions
create table public.attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  position int not null check (position >= 1),
  question_id text not null references public.questions (id),
  option_order jsonb, -- mcq: ["C","A","D","B"]; matching: [3,0,5,1,2,4] (indexes into options)
  answer jsonb, -- mcq: "B" (original letter); matching: 2 (original index); short: "text"
  answered_at timestamptz,
  is_correct boolean, -- null for short
  self_mark text check (self_mark in ('full', 'partial', 'none')),
  unique (attempt_id, position)
);
create index attempt_questions_question_idx on public.attempt_questions (question_id);

-- ---------------------------------------------------------------- violations
create table public.violations (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  type text not null,
  occurred_at timestamptz not null default now(),
  meta jsonb
);
create index violations_attempt_idx on public.violations (attempt_id);

-- ---------------------------------------------------------------- question_reports
create table public.question_reports (
  id bigint generated always as identity primary key,
  attempt_id uuid references public.attempts (id) on delete set null,
  question_id text not null references public.questions (id),
  student_id uuid references public.profiles (id) on delete set null,
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
alter table public.courses enable row level security;
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.assessments enable row level security;
alter table public.student_assessment_settings enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_questions enable row level security;
alter table public.violations enable row level security;
alter table public.question_reports enable row level security;

-- Public catalogue data (no secrets).
create policy "courses readable by signed-in users" on public.courses
  for select to authenticated using (true);
create policy "assessments readable by signed-in users" on public.assessments
  for select to authenticated using (true);

-- Own rows only.
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "read own attempts" on public.attempts
  for select to authenticated using (student_id = (select auth.uid()));
-- Answer rows only after the attempt is finished (is_correct must not leak mid-exam).
create policy "read own finished attempt questions" on public.attempt_questions
  for select to authenticated using (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_id
        and a.student_id = (select auth.uid())
        and a.status <> 'in_progress'
    )
  );

-- questions, violations, question_reports, student_assessment_settings: no client policies
-- (service role only). No insert/update/delete policies anywhere: writes go through the server.

-- ---------------------------------------------------------------- seed
insert into public.courses (code, name)
values ('CBTA-L4', 'CBT&A Level 4');

insert into public.assessments (course_id, code, title)
select id, 'FULL_FF', 'Full Final Formative' from public.courses where code = 'CBTA-L4';

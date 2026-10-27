# exam.hadia.academy

CBT&A Level 4 online formative assessment (Phase 1). Next.js 16 + Supabase. Plan and rules: `../docs/PLAN.md`, `../CLAUDE.md`.

## First-time setup

1. **Keys** — open `.env.local` and fill in the values (Supabase → Project Settings → API, and Connect → Session pooler URI for `SUPABASE_DB_URL`). Never commit this file.
2. **Supabase Auth settings** — Authentication → Sign In / Providers: turn **off** "Allow new users to sign up" (only the admin creates accounts).
3. Install and set up the database:

```bash
npm install
npm run db:migrate               # creates tables, RLS, course + FULL_FF assessment
npm run import:questions -- --apply   # loads the "✅ Final Upload" sheet
npm run create-admin             # asks for your name, mobile, password
npm run dev                      # http://localhost:3000
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `npm run build` + `npm start` | run locally / production |
| `npm test` | exam rules (selection, scoring, mobile, CSV) |
| `npm run db:check` | runs migrations + RLS checks in an in-memory Postgres |
| `npm run db:migrate` | applies new files in `supabase/migrations/` to Supabase |
| `npm run import:questions` | validates the Excel → `scripts/out/import-report.md` (add `-- --apply` to upload) |
| `npm run cblm:pages` | proposes a CBLM page for each Short → `scripts/out/short-cblm-pages.xlsx` |
| `npm run cblm:apply -- <file>` | loads pages Arif marked ✅ in that sheet |
| `npm run create-admin` | creates an admin account |
| `npm run set-password` | sets a new password for any account by mobile (e.g. forgotten admin password) |

## How it works

- Login = mobile + password. Each mobile maps to a hidden auth email `8801…@students.hadia.academy`; the real mobile/email live in `profiles`.
- The browser never gets `questions`. Pages and server actions use the service-role client after checking the signed-in user (`src/lib/auth.ts`). RLS is on for every table.
- Exam engine: `src/lib/exam/engine.ts` (DB) + `src/lib/exam/logic.ts` (pure rules). Server stores `deadline_at`; late answers are rejected; overdue attempts auto-submit on the next request.
- Colours/sizes only in `src/styles/tokens.css`.

## Hosting (later)

Domain: `exam.techhunt.org`. Hostinger Node.js Web App from GitHub: build `npm run build` (webpack — Turbopack cannot start its CSS worker on Hostinger), start `npm start`, **Node 22+** recommended (supabase-js asks for it; the build also passes on Node 20). Add the same env vars (not `SUPABASE_DB_URL`) in hPanel.

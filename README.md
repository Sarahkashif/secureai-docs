# SecureAI Docs

**Secure Document Intelligence for Modern Organizations.** Upload confidential documents, ask an AI assistant questions, and get answers only from files each person is allowed to see, with sources cited and every access logged.

Stack: React, TypeScript, Tailwind CSS, Supabase (Auth, Postgres, pgvector, Storage), Vercel serverless functions, any OpenAI-compatible LLM API.

## Features

| Area | What's included |
|---|---|
| Auth | Sign up, log in, forgot/reset password, Supabase session management, protected and role-based routes |
| Documents | PDF/DOCX/TXT upload, 6 categories, search, filters, detail view, preview, download, delete |
| AI (RAG) | Extract, chunk, embed, retrieve, grounded answer with citations. Fixed reply when nothing is found: *"Information not found in uploaded documents."* |
| RBAC | Employee, HR Manager, Admin. Role check before retrieval, Row Level Security underneath |
| Security | RLS everywhere, signed URLs, audit logs, rate limiting, file-access tracking, strict CSP, server-only secrets |
| Admin | User management (invite, roles, deactivate), subscriptions, audit logs (CSV export), analytics, security dashboard |
| Plans | Free / Basic / Professional / Enterprise, with document and user limits enforced in the API and the database |
| UX | Dark mode, notifications, activity timeline, suggested questions, search history, charts, loading/empty/error states, mobile responsive |

## 1. Supabase setup (about 10 minutes)

1. Create a project at [supabase.com](https://supabase.com) (note the database password).
2. **SQL Editor**: run these files from `supabase/migrations/` **one at a time, in order**. Paste a file, click Run, wait for "Success", then do the next:
   `001_schema.sql`, `002_rls.sql`, `003_personal_visibility.sql`, `004_ingestion.sql`, `005_chat.sql`, `006_admin_hardening.sql`
   (003 must be its own run; Postgres cannot use a new enum value in the transaction that adds it.)
3. **Authentication > Providers > Email**: for a smooth demo turn **off** "Confirm email". Set **Minimum password length to 10**.
4. **Project Settings > API**: copy the **Project URL**, the **anon** key and the **service_role** key.
5. Confirm **Storage** shows a private bucket named `documents` (created by 002).

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill it in.

| Variable | Where used | Notes |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Browser | Safe to expose; RLS protects data |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Server | Same values as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **Never** prefix with `VITE_`. Never commit |
| `LLM_API_KEY` | Server only | OpenAI or any OpenAI-compatible provider |
| `LLM_BASE_URL` | Server | Default `https://api.openai.com/v1` |
| `LLM_MODEL` | Server | Default `gpt-4o-mini` |
| `EMBEDDING_MODEL` | Server | Must output **1536 dimensions** (`text-embedding-3-small`) |
| `RAG_MIN_SIMILARITY` | Server | Default `0.30` |

## 3. Run locally

```bash
npm install
npm run seed          # creates the demo company, 3 users, 7 indexed documents, sample activity
npx vercel dev        # serves the frontend AND /api (plain `npm run dev` has no API)
```

Open the URL it prints (usually http://localhost:3000). First `vercel dev` run asks you to log in and link a project: accept the defaults, or deploy first (section 5) and run `vercel env pull .env.local`.

### Demo accounts (created by `npm run seed`, password for all: `Demo#Pass2026`)

| Role | Email |
|---|---|
| Admin | admin@secureai-demo.com |
| HR Manager | hr@secureai-demo.com |
| Employee | employee@secureai-demo.com |

### 5-minute demo script

1. **Employee**: ask *"What is our leave policy?"* (answered, with sources). Ask *"What are the salary rules?"* (**restricted**, logged).
2. **HR Manager**: ask *"What are the salary rules?"* and *"Which employees belong to sales?"* (answered from restricted files).
3. **Employee**: open Library. HR and salary files are not listed. Ask something not in any document (*"What is the dental coverage?"*) to show *"Information not found in uploaded documents."*
4. **Admin**: Audit logs (the denied attempt is there), Security dashboard, Users (invite someone, change a role), Subscription (switch plans), Analytics.
5. Upload a new PDF as any user and ask about it.

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "SecureAI Docs MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/secureai-docs.git
git push -u origin main
```
`.gitignore` already excludes `.env*` and `node_modules`. Check `git status` shows no `.env.local` before pushing.

## 5. Deploy on Vercel

1. [vercel.com](https://vercel.com) > **Add New > Project** > import the GitHub repo.
2. Framework preset **Vite** (build `npm run build`, output `dist`). Leave defaults.
3. **Environment Variables**: add every variable from section 2 (all of them, for Production).
4. **Deploy**.
5. Supabase > **Authentication > URL Configuration**: set **Site URL** to your Vercel URL and add `https://YOUR-APP.vercel.app/**` to **Redirect URLs** (needed for password-reset emails).
6. Seed the deployed database once from your machine: `npm run seed` (uses the same Supabase project).

## 6. Deployment checklist

- [ ] Migrations 001 to 006 ran successfully, in order
- [ ] Email confirmation off (demo) and minimum password length 10
- [ ] All env vars set in Vercel, `SUPABASE_SERVICE_ROLE_KEY` **not** prefixed with `VITE_`
- [ ] `npm run seed` completed and printed the three demo accounts
- [ ] Vercel Site URL and Redirect URL set in Supabase
- [ ] Sign in as each role and run the demo script above
- [ ] Upload a PDF, wait for "Ready", ask a question about it

## Troubleshooting

| Symptom | Fix |

|---|---|
| Blank page, "Missing VITE_SUPABASE_URL" | Env vars missing; redeploy after adding them |
| Upload says "Service temporarily unavailable" | Migration 004 not run (rate-limit function missing) |
| Chat always says "Information not found" | Documents not indexed (check status in Library), embedding model is not 1536-dim, or lower `RAG_MIN_SIMILARITY` to 0.2 |
| "The AI service is unavailable" | Check `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`; see Vercel function logs |
| `/api/*` returns 404 locally | Use `npx vercel dev`, not `npm run dev` |
| Signup fails with "Database error saving new user" | Migration 006 not run, or 001/002 ran out of order |
| Library empty after seed | You are signed in as a different organization; use the demo accounts |
| Scanned PDF rejected | Only text-based PDFs are indexed (no OCR) |

## Security model

1. **Database (the guarantee).** RLS on every table. `can_read_document()` is the single rule for document and chunk visibility. Retrieval (`match_chunks`) runs as the caller, so the model never receives text the user cannot open.
2. **API.** Every endpoint verifies the JWT, loads the profile, rate-limits, and checks role and organization in code. Audit rows are written only by the server.
3. **Pre-retrieval RBAC.** Questions about salary or confidential HR topics are denied for employees before any search or model call, and the attempt is logged. This keyword classifier is a first layer; RLS still protects against paraphrases it misses.
4. **Prompt-injection hardening.** Retrieved text is delimited and declared untrusted; the model is instructed never to follow instructions inside documents.
5. **Hardening.** Users can edit only their own name and department; role, plan, and account status change only through the admin API. Invited users get their organization and role from server-only `app_metadata`.

## Known limits (MVP)

- Billing is simulated (no payment collected). Add Stripe in `api/admin.ts` (`set_plan`) for production.
- No OCR for scanned PDFs. Answers are returned whole (not streamed).
- Pre-retrieval topic detection is keyword-based.
- Invited users receive a one-time temporary password (no email service is configured).

## Project structure

```
api/               Vercel functions: ingest, chat, documents, admin, audit (+ _lib helpers)
src/               React app (pages, components, hooks, context, lib)
supabase/migrations/   001 to 006 SQL
scripts/seed.ts    Demo data seeder
demo-data/         Sample company documents
```

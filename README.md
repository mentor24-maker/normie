# Normie Polls

Normie is a Next.js app on Vercel with Supabase. The public site serves personality polls and builder-driven pages. The **admin control room** (`/admin`) is protected by Supabase Auth, role-based access, and middleware — used for polls, page builder, gallery, shop, users, team, and CSV import.

## Features

- Sequential poll experience with one answer per poll per visitor session
- Previous poll results shown alongside the current question
- Visual page builder with saved modules and templates
- Protected admin area with roles: `owner`, `admin`, `editor`, `viewer`
- CSV import at `/admin/import` (admin-only)
- CI: typecheck, lint, test, dependency audit, and production build
- Supabase SQL schema and migrations included

## Tech stack

- Next.js App Router
- TypeScript
- Supabase
- Vercel

## 1. Create the local project

Use Node 22 (see `.nvmrc`):

```bash
nvm use
npm install
```

`npm install` uses `legacy-peer-deps` (see `.npmrc`) because Tiptap peer dependencies require it.

Copy the environment template:

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Security: environment secrets

- Never commit `.env`, `.env.local`, or any file containing live keys.
- Keep local secrets only in `.env.local` (already gitignored).
- Treat `SUPABASE_SERVICE_ROLE_KEY` as highly sensitive (server-only).
- If a key is ever exposed (chat screenshot, logs, pasted file, or commit), rotate it immediately.

### Secret rotation checklist (Supabase + Vercel)

1. In Supabase, rotate:
   - `anon` public key
   - `service_role` secret key
2. Update local `.env.local` with the new values.
3. Update the same env vars in Vercel project settings.
4. Redeploy and verify the site and admin flows.
5. Invalidate old keys and confirm old values no longer work.

## 2. Set up Supabase

**New project**

1. Create a new Supabase project.
2. In the SQL Editor, run `supabase/schema.sql` (canonical, idempotent).
3. Optionally run `supabase/seed.sql` for example polls.

**Existing project** (upgrading from an older Normie schema)

1. Run `supabase/migrations/000_incremental.sql`.
2. Run `supabase/migrations/001_legacy_users_split.sql` only if you still have admin accounts stored in `public.users` instead of `team_users`.

**Credentials**

1. In Supabase project settings, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

## 3. CSV format

The importer expects a header row like:

```csv
ID,Category,Question,Option_A,Option_B
001,Identity & Psychology,Would you rather be misunderstood or overlooked?,Misunderstood,Overlooked
002,Money & Success,Would you rather succeed early or succeed late?,Early,Late
```

Rules:

- `Category` and `Question` are written to `polls`
- `Option_A`, `Option_B`, and any additional `Option_*` columns are written to `poll_options`
- `ID` is ignored by the importer
- Each row needs at least 2 non-empty option values
- Imported rows are appended in order as new polls

## 4. Run locally

```bash
npm run dev
```

Open:

- Main poll site: [http://localhost:3000](http://localhost:3000)
- Admin login: [http://localhost:3000/admin](http://localhost:3000/admin)
- CSV importer (after sign-in): [http://localhost:3000/admin/import](http://localhost:3000/admin/import)

### Quality checks (local)

```bash
npm run verify        # typecheck, lint, test, audit
npm run verify:full   # verify + production build
```

Optional git hook (runs `verify` before each commit):

```bash
chmod +x .githooks/pre-commit scripts/verify.sh
git config core.hooksPath .githooks
```

## 5. Push to GitHub

Create a repository on GitHub, then run:

```bash
git init
git add .
git commit -m "Initial polling site"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## 6. Deploy to Vercel

1. Log into Vercel.
2. Click **Add New > Project**.
3. Import the GitHub repository.
4. In the Vercel project settings, add these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy.

Vercel will automatically redeploy when you push updates to GitHub.

## 7. Suggested workflow for future poll uploads

1. Prepare a CSV file.
2. Visit `/admin/import`.
3. Upload the file.
4. Refresh the main poll page and test the sequence.

## Notes

- Database changes belong in `supabase/schema.sql` (new installs) or numbered files under `supabase/migrations/` (upgrades). Avoid one-off SQL files at the repo root.
- Responses are tied to a browser session cookie, so a visitor answers each poll once per browser/session identity.
- Admin APIs require a valid Supabase session and `team_users` role; public poll/contact writes use the anon key where RLS allows it.
- `/admin` and `/preview` are excluded from search indexing via `robots.ts`.

## Repository hygiene and supply chain

- **Lockfile:** Always commit `package-lock.json`. CI uses `npm ci` (never `npm install` in production pipelines).
- **Dependabot:** Weekly PRs for npm and GitHub Actions (`.github/dependabot.yml`). Tiptap packages are ignored — upgrade those manually on the pinned `3.22.5` set.
- **Audit:** `npm run audit:ci` fails on high-or-critical vulnerabilities; moderate issues in transitive deps (e.g. PostCSS via Next) are tracked separately.
- **Security reports:** See [SECURITY.md](SECURITY.md).
- **Do not commit:** `.env.local`, `gemini-code-*.txt`, duplicate `route 2.ts` files, or other local scratch artifacts (see `.gitignore`).

## Observability and incident response

### What is instrumented

- Structured JSON logs (`lib/observability/logger.ts`) with automatic redaction of emails, tokens, and secrets.
- Request correlation via `x-request-id` on every response (set in middleware).
- Public API wrappers on poll and contact routes with centralized 500 logging.
- Health probe at `GET /api/health` (returns `503` when Supabase is unreachable).
- UI error boundaries (`app/error.tsx`, `app/global-error.tsx`) that log digest references.

### Uptime monitoring

Point your monitor (Vercel, Better Stack, UptimeRobot, etc.) at:

```text
GET https://YOUR_DOMAIN/api/health
```

Expect HTTP `200` and `{ "status": "ok" }`. A `503` means the database check failed.

For deploy metadata during an incident, set `HEALTH_CHECK_TOKEN` in Vercel and call:

```bash
curl -s -H "x-health-token: $HEALTH_CHECK_TOKEN" https://YOUR_DOMAIN/api/health
```

### Triage checklist

1. Confirm `/api/health` status and Supabase project health in the dashboard.
2. Check the latest Vercel deployment and function logs; filter by `requestId` from a user report.
3. Verify env vars (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`) after any rotation.
4. If polls fail, confirm migrations (`supabase/migrations/000_incremental.sql`) ran on the target database.
5. For admin-only failures, check Supabase Auth status and `team_users` role rows.

### Log levels

Set `LOG_LEVEL` to `debug`, `info`, `warn`, or `error` in Vercel. Default is `info` in production.

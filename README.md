# Normie Polls

Normie Polls is a Next.js site designed for Vercel with Supabase as the database. Each page shows the previous poll's results on the left and the next multiple-choice question on the right. It also includes a CSV import page for loading question sets without building a full admin backend.

## Features

- Sequential poll experience with one answer per poll per visitor session
- Previous poll results shown alongside the current question
- CSV upload tool at `/admin/import`
- Supabase SQL schema and seed files included
- Ready to deploy to GitHub and Vercel

## Tech stack

- Next.js App Router
- TypeScript
- Supabase
- Vercel

## 1. Create the local project

Install dependencies:

```bash
npm install
```

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

1. Create a new Supabase project.
2. In Supabase, open the SQL Editor.
3. Run [`supabase/schema.sql`](/Users/mentor/Desktop/Projects/Normie/supabase/schema.sql).
4. Optionally run [`supabase/seed.sql`](/Users/mentor/Desktop/Projects/Normie/supabase/seed.sql) to load example polls.
5. In Supabase project settings, copy:
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
- CSV importer: [http://localhost:3000/admin/import](http://localhost:3000/admin/import)

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

- This version does not include a poll builder backend yet.
- The admin tools are currently open for solo hobby development. If you later want stronger security, the next step would be Supabase Auth or Vercel authentication middleware.
- Responses are tied to a browser session cookie, so a visitor answers each poll once per browser/session identity.

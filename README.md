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
- `IMPORT_ADMIN_KEY`

Use a long random string for `IMPORT_ADMIN_KEY`. That key is required to upload CSV files from `/admin/import`.

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
   - `IMPORT_ADMIN_KEY`
5. Deploy.

Vercel will automatically redeploy when you push updates to GitHub.

## 7. Suggested workflow for future poll uploads

1. Prepare a CSV file.
2. Visit `/admin/import`.
3. Enter the `IMPORT_ADMIN_KEY`.
4. Upload the file.
5. Refresh the main poll page and test the sequence.

## Notes

- This version does not include a poll builder backend yet.
- The importer is protected only by the shared import key. If you later want stronger security, the next step would be Supabase Auth or Vercel authentication middleware.
- Responses are tied to a browser session cookie, so a visitor answers each poll once per browser/session identity.

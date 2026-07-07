# Normie — Project Guide

Normie is a Next.js 16 (App Router) + TypeScript + Supabase app on Vercel: public
personality polls, a visual page builder, a player portal, and a protected admin
control room. See `README.md` for setup.

## Conventions (single source of truth)

All coding conventions, builder architecture, style-guide rules, and known pitfalls
live in `.cursorrules` (shared with Cursor). Read and follow it — do not duplicate
its content here or elsewhere.

@.cursorrules

## Commands

- `npm run dev` — dev server on port 3000
- `npm run verify` — typecheck + lint + tests + dependency audit (run before committing)
- `npm run verify:full` — verify + production build
- `npm test` / `npm run test:watch` — vitest
- `npm install --legacy-peer-deps` — always, due to tiptap peer-dependency conflicts

## Environment

**Local dev uses a local Supabase stack** (Docker + `supabase start`);
production is a separate hosted project that only Vercel talks to.
- `supabase start` / `supabase stop` manage the stack; Studio at
  http://127.0.0.1:54323, mail catcher at http://127.0.0.1:54324
- `supabase db reset` rebuilds the local DB from
  `supabase/migrations/` (the `0000_local_baseline.sql` + any newer
  migrations); re-seed polls via admin import of
  `polls/normie_100_questions_starter.csv`
- `supabase/migrations-history/` is the pre-baseline record of what was
  hand-applied to production — a record, NOT a replayable chain; never
  move it back
- **New migration flow:** add `supabase/migrations/NNN_name.sql` → apply
  locally (`supabase db reset` or paste in local Studio) → update
  `supabase/schema.sql` (drift guard enforces) → PR → after merge, paste
  the migration into the PRODUCTION SQL editor by hand
- Local admin login: mentor24@gmail.com / local-dev-password-1
- Production keys live commented in `.env.local` for deliberate
  local-against-prod work only

- Node 22 (`.nvmrc`), npm ≥ 10
- Supabase env vars via `lib/env.ts` (`getSupabaseEnv` / `getPublicSupabaseEnv`) —
  never read `process.env` directly for Supabase keys
- SQL schema and migrations in `supabase/migrations/` (numbered, `.sql` only —
  no data/CSV files in that directory; CSV import templates live in `polls/`)
- When adding a migration, also update the `supabase/schema.sql` snapshot —
  `lib/schema-drift.test.ts` fails CI if tables/columns from the migration
  chain are missing from the snapshot

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

⚠️ **Local dev shares the PRODUCTION Supabase database** (single project by
deliberate budget decision, July 2026). Treat every dev-server action as
live: no destructive SQL experiments, no bulk deletes, no schema changes
outside reviewed migrations, and prefer read paths when exploring. Apply
new migrations via the Supabase SQL editor only after the PR containing
them is merged. Revisit separation (local Supabase CLI via Docker, or a
second project) when budget or team growth justifies it.

- Node 22 (`.nvmrc`), npm ≥ 10
- Supabase env vars via `lib/env.ts` (`getSupabaseEnv` / `getPublicSupabaseEnv`) —
  never read `process.env` directly for Supabase keys
- SQL schema and migrations in `supabase/migrations/` (numbered, `.sql` only —
  no data/CSV files in that directory; CSV import templates live in `polls/`)
- When adding a migration, also update the `supabase/schema.sql` snapshot —
  `lib/schema-drift.test.ts` fails CI if tables/columns from the migration
  chain are missing from the snapshot

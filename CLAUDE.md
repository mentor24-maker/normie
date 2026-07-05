# Normie — Project Guide

Normie is a Next.js 15 (App Router) + TypeScript + Supabase app on Vercel: public
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

- Node 22 (`.nvmrc`), npm ≥ 10
- Supabase env vars via `lib/env.ts` (`getSupabaseEnv` / `getPublicSupabaseEnv`) —
  never read `process.env` directly for Supabase keys
- SQL schema and migrations in `supabase/migrations/` (numbered, `.sql` only —
  no data/CSV files in that directory; CSV import templates live in `polls/`)

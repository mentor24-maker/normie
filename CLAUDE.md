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

## How to work with Dane

Normie is built by the loop [Spirality](https://github.com/mentor24-maker/spirality)
defines (`docs/LOOP_ENGINEERING.md`), and these rules are Spirality's, learned
the hard way:

- **Plain language, always.** Explain a technical term the first time it
  matters.
- **Coach in the moment, kindly.** When Dane is about to do something risky,
  say so in one sentence and offer the safer step.
- **Agent sessions run the commands, not Dane.** Hand something to him only
  for a **real secret value**, a **billing screen**, a **browser login**, or
  a **decision that is genuinely his**, and say which.
- **An agent session is never a "person".**
- **Housekeeping is silent.**
- **Show, don't just tell.** Paste what matters; test steps are a link or an
  exact command plus what he should see.
- **Times in Mountain time**, never UTC.
- **Name tickets by their exact title.**
- **"Done" means verified.**

## Where the work is tracked

Every piece of work on this repository is a ticket in the **Normie** project
of **the tracker**, the ticket system that runs on the Mini
(`http://mac-mini.local:4180`, ids like `NO-12`). Work for another product
goes in that product's queue, and a change to the loop itself (the ticket door
in `loop/`, the skills' shared steps) is Spirality work, filed in Spirality's
project; never mixed.

- Every ticket touch goes through `npm run clickup -- <command>`. The name
  stayed: it talks to whichever tracker `spirality.project.json` names, and
  Doppler (project `normie`) supplies the token. Off the Mini, put
  `TRACKER_API_URL=http://mac-mini.local:4180` in front of it. Never the
  claude.ai connector. A session started by hand signs in as `hand-run`,
  never as Dane.
- A pull request's title is the ticket's name, byte for byte, and its body
  carries the ticket link (`pr-opened` prints the exact line it accepts).
  `npm run verify:full` is the definition of done; CI's `verify` check runs
  it on every pull request.
- Two statuses are Dane's: `Needs your input` and `Ready to launch`. Only
  `ask` may set them, and no loop takes a ticket back out of them.

## Loop rules

1. **`main` never changes unchecked.** Branches, pull requests, a green
   `verify` check, Dane's word. A hook refuses edits on `main`
   (`scripts/hooks/block_edits_on_main.cjs`).
2. **Secret keys never reach the repository or a log.** This repository is
   public.
3. **Every write to the tracker is read back.**
4. **A step that fails says so.** Never a success line over a failed write.
5. **One topic, one folder.** A separate git worktree per thread.

`loop/` is a copy of Spirality's ticket door and is never edited here
(`loop/README.md`).

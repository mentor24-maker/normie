# Handoff — Normie Overhaul Complete (2026-07-07)

For the next agent working with Dane (mentor24@gmail.com) on Normie or picking up
the Starcaster mission. Written at the end of a multi-day overhaul campaign
(PRs #14–#36, all merged to `main`, all deployed via Vercel).

## Who you're working with

- Solo developer, learning Git/GitHub concepts as he goes — **explain concepts
  while working**, don't just execute.
- He never touches github.com. **You run the full loop**: branch → commit →
  push → PR → wait for CI green → `gh pr merge N --merge --delete-branch` →
  sync main. Merge commits, not squash. He has standing authorization for you
  to merge on green without asking.
- Watch for diminishing returns. He explicitly said: "We need to call it good
  enough at some point so we can move on to feature development." Do not
  gold-plate. Triage new findings against feature work.
- `gh pr create` with special characters in `--body` breaks the shell — write
  body to a file, use `--body-file`.

## Normie state: "good enough" — foundation complete

| Foundation check | Status |
|---|---|
| CI gates every merge | ✅ typecheck + lint + 401 tests + npm audit + schema-drift guard |
| Dev isolated from production | ✅ local Docker Supabase (`supabase start`); prod = Vercel only |
| No god components | ✅ all four decomposed (see below) |
| Critical-journey browser tests | 🟡 only open item — Playwright smoke suite, parked as between-features work |

### What the overhaul did (highlights)

- **Security**: service-role route audit (all admin routes guarded, middleware
  + RBAC); IP rate limiting on public player auth endpoints; fixed 8 call
  sites that only read the first 1000 auth users (`lib/auth-users.ts` paging
  helpers — use these for any auth-user lookup).
- **Next.js 16** (from 15): `proxy.ts` (renamed from middleware.ts), flat
  ESLint config, Turbopack builds. React Compiler lint rules arrived with it.
- **React Compiler burn-down**: 63 → 17 warnings. The 17 left are ALL the
  architectural fetch-in-effect pattern — **do not attempt to lint-fix them**;
  they clear only via a data-layer migration (React Query / RSC). Rules are
  demoted to "warn" in `eslint.config.mjs`; remove that override only after
  the data layer lands. Patterns for fixed categories live in
  `lib/use-client-value.ts` (hydration reads) and adjust-during-render
  (prev-value compare).
- **Decompositions** (all behavior-preserving, code moved verbatim):
  - `admin-game-workspace` 4,770 → 192 lines; five section components own
    their state under `components/admin-game/`
  - `builder-module-card` 2,473 → 739; per-module-type editors in
    `components/builder/`
  - `builder-module-repository-list` 2,473 → 970; three table components
  - `admin-builder-editor` 2,063 → 824 via three hooks
    (`use-builder-draft-ops`, `use-builder-persistence`,
    `use-builder-media-modals`) + `BuilderWorkspacePanel`. Hooks have no React
    primitives → they test as plain closures (`use-builder-draft-ops.test.ts`).
- **globals.css** split into ordered chunks `app/styles/NN-*.css`; cascade
  order is load-bearing, never reorder imports.
- **Schema**: `supabase/schema.sql` is the canonical snapshot;
  `lib/schema-drift.test.ts` enforces that migrations update it.
  `supabase/migrations-history/` = non-replayable record of prod's hand-applied
  history; `supabase/migrations/` = `0000_local_baseline.sql` + future
  migrations only.

### Local dev (new as of today)

```
supabase start        # Docker stack; Studio :54323, Mailpit :54324
npm run dev           # against local DB
supabase db reset     # rebuild local DB from baseline + migrations
supabase stop         # reclaim RAM
```

- Local admin: mentor24@gmail.com / local-dev-password-1
- Seed polls: admin import of `polls/normie_100_questions_starter.csv`
- **New migration flow**: write `supabase/migrations/NNN_name.sql` → apply
  locally → update `schema.sql` (guard enforces) → PR → after merge, paste
  into the PRODUCTION SQL editor by hand. Production keys live commented in
  `.env.local` for deliberate use only.

### Do-not-do list (hard-won)

- Don't "clean up" the 64 `!important` declarations — audited 2026-07:
  they override the builder's dynamic inline styles (incl. 25 media-query
  mobile overrides that structurally require it). See `.cursorrules`.
- Don't lint-fix the 17 fetch-in-effect warnings (architectural, above).
- Don't move `migrations-history/` back into `migrations/`.
- Don't upgrade tiptap (pinned 3.22.5 family) or run npm install without
  `--legacy-peer-deps` (`.npmrc` handles it).
- Dependabot ignores npm majors by config — majors are deliberate,
  one-per-pass upgrades (TS 6, ESLint 10, Vitest 4 still pending, low priority).
- React Compiler gotchas: keep effects below the hook destructures they
  reference; conditional setState above manual `useMemo`s breaks
  `preserve-manual-memoization`; pass hook results wholesale
  (ReturnType-typed objects) instead of threading 50 props.

## The next mission (higher priority than anything above)

**Switch to `~/WebApps/starcaster`.** It already had its own top-10 analysis
and major overhaul in earlier sessions (this conversation has no memory of
them — check that project's own memory/docs). The plan Dane approved:

1. Fresh codebase analysis — but triage for **critical-only** items
   (his words; no second overhaul)
2. Optionally repeat the local-Supabase dev setup there (Docker is now
   installed on this machine; the pattern from PR #36 transfers)
3. Then the real goal: **AI agent systems development** — that's the feature
   work everything else has been clearing the road for

Remaining Normie work (Playwright smoke, poll-loop route-test backfill,
React Query adoption, tooling majors) is parked and prioritized in the
auto-memory `overhaul-backlog.md`; pick it up between Starcaster features.

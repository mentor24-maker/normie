# Reminders Refactor — Effort Estimate & Prerequisites

**Date:** 2026-06-01
**Re:** Top-10 Recommendation #1 — Resolve the in-flight game-reminders refactor

---

## Scope reality check

The "reminders refactor" is the load-bearing piece of a larger in-flight session — **63 files changed, ~1,900 insertions / ~2,000 deletions** — so this isn't just reminders. Bundled in are:

- A new **builder reminder module** (reminders become a builder primitive instead of an admin-API resource)
- A new **game audience field**
- A **floating-image runtime**
- **Gallery-media badge** work
- **Reward-symbol renames**
- Dev-only scaffolding (`app/api/dev/`, `site-header-dev-reset-button.tsx`, `public-page-diagnostics-hud.tsx`)

Deleted: `app/api/admin/game/reminders/[id]/route.ts`, `app/api/admin/game/reminders/route.ts`, `app/api/player/reminders/route.ts`, `components/player-game-reminders-host.tsx`, `components/player-game-reminders.tsx`.

New (untracked) headline files: `components/builder-reminder-runtime.tsx`, `components/builder/builder-reminder-module-settings.tsx`, `components/reminder-criteria-editor.tsx`, `components/player-game-reminder-displays.tsx`, `components/player-game-reminder-diagnostics-panel.tsx`, `lib/builder-reminder-module.ts`, `lib/game-reminder-presentation.ts`, `lib/player-reminder-events.ts`, `supabase/migrations/044_game_reminder_appearance.sql`, plus migrations 039 and 040.

---

## Effort estimate

| Path | Wall clock | What you get |
|---|---|---|
| **Minimum-viable land** — stage logical commits, run typecheck + existing tests, manual smoke in browser, apply migrations 039/040/044 to local Supabase, ship as one PR | **~4–6 hours** | Working tree clean, deployable |
| **Recommended** — same, plus split into ~3 PRs (reminders refactor / audience / gallery-badge & symbol rename), add tests for the 6 untracked reminder files, strip dev-only scaffolding behind a flag or remove it | **~1–2 focused days (10–16 hrs)** | Reviewable, tested, no dev scaffolding leaking to prod |
| **Pristine** — recommended + reconcile any orphaned `game_reminders` rows from the deleted admin API, write a data-migration note, full Playwright smoke of the new reminder flow end-to-end | **~2–3 days** | Bulletproof |

---

## What I need from you

1. **Scope intent.** Are all 24 untracked files *meant* to ship, or is some of it scratch? Specifically flag-check:
   - `app/api/dev/*` and `components/site-header-dev-reset-button.tsx` — dev-only?
   - `components/public-page-diagnostics-hud.tsx` and `player-game-reminder-diagnostics-panel.tsx` — for everyone or admins only?
   - `docs/Handoffs/Prompt - Normie Platform Handoff.md` — commit or keep local?

2. **PR strategy.** One big PR or split into reminders / audience / gallery-symbol? Split is safer to review and revert; one PR is faster.

3. **Production data state.** Does the live `game_reminders` table have rows created via the now-deleted `/api/admin/game/reminders` route? If yes, we need a migration plan (the new system reads reminders from builder modules, not the old table). If no, we can drop the old table in a follow-up migration.

4. **Local environment access.** Permission to: run `npm run dev:reset`, apply migrations 039/040/044 to local Supabase, start the dev server, and click through the admin → builder → player flow without per-step approval.

5. **Test bar.** Do you want me to write tests for the six new untracked reminder files (`builder-reminder-runtime.tsx`, `reminder-criteria-editor.tsx`, `game-reminder-presentation.ts`, `player-reminder-events.ts`, etc.) before merging, or accept current coverage and add tests in a follow-up?

If you answer those five, I can give you a firm number and start.

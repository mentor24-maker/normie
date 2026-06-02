# Prompt: Generate Normie Platform Handoff

Use this prompt in a **new agent chat** with the Normie workspace open (`~/WebApps/normie`). The agent should **write** the deliverable file; this file is only the instructions.

**Optional prefix** (paste above the block below when running):

> Audience extension may add segments beyond `public` / `portal` / `both` (e.g. logged-out only, poll participants). Do not design new schema yet—document extension points only unless you find existing types.

---

## Copy from here

```markdown
# Task: Author a Normie engineering handoff document for a successor AI agent

You are writing **internal engineering documentation**, not user-facing copy. The reader is an **AI agent or developer** who will implement features in this repo with minimal prior context. Accuracy matters more than breadth of buzzwords: **verify every claim in the codebase** (grep, read files, trace call chains). Mark anything you could not verify as **UNVERIFIED**.

## Repository and constraints

- **Workspace:** `~/WebApps/normie` (Next.js 15 App Router, TypeScript, Supabase PostgreSQL, **no Tailwind** — all styles in `app/globals.css`)
- **Read first:** `.cursorrules` (Cardinal UI rules, Page Builder architecture, API conventions, pitfalls)
- **Secondary:** `docs/look-and-feel-compiled.md`, and any existing handoffs under `docs/Cursor Threads/` and `docs/Handoffs/` (use as format reference, not as source of truth if stale)
- **Do not** suggest deleting or squashing applied Supabase migrations (`037_game_reminders`, `043_game_audience`, `044_game_reminder_appearance`, etc.) — migration history must stay intact
- **Do not** commit, push, or modify `.env` / secrets
- **npm install** must use `--legacy-peer-deps` (Tiptap peer deps); Tiptap packages pinned to **3.22.5**

## Product context (include in doc)

- **Normie** is a public site + admin + **player portal** for a poll/game community; pages are largely **Page Builder–driven** (templates in DB, rendered via `BuilderTemplatePreview` / `DynamicPageShell`)
- **Player portal** slug: `portal`; register link pattern documented in `lib/player-portal-auth-url.ts`
- **$NORMIE** token (Solana utility only — no financial advice in UI)
- **Privacy:** individual user data is never sold; only aggregate anonymized data
- **Deployment:** Vercel; DB: Supabase with RLS

## Near-term product direction (emphasize in handoff)

We are **extending reminder audience selection and related game-layer behavior** to be more robust. Document the **current** implementation precisely and a **“extension surface”** section: where audience is defined, stored, normalized, evaluated at runtime, and mirrored (if at all) in legacy DB schema.

**Critical distinction (must be explicit):**
- **Public reminders today:** Page Builder `reminder` modules in page template JSON — **not** the legacy `public.game_reminders` table
- **Legacy table:** `game_reminders` (+ migrations 037/043/044) — **no runtime reads/writes** in app after cleanup; keep migrations for history only
- **Game Events** (admin `game_level_events`, confetti, overlays) are a **separate** pipeline from builder reminders

## Deliverable

Create **one markdown file**:

`docs/Handoffs/Handoff - Normie Platform Architecture.md`

Use clear headings, tables, and ASCII/mermaid diagrams where they reduce ambiguity. Target **thorough but scannable** (aim 2,500–6,000 words unless the repo truly needs more).

### Required sections

1. **Executive summary** — What Normie is, how data flows at a glance, what the next agent should do first (commands, URLs, smoke checks).

2. **Repository map** — Top-level tree with **purpose** of each major area (`app/`, `components/`, `lib/`, `src/site/`, `supabase/`). Not a raw file dump.

3. **Runtime architecture**
   - Request routing: home vs builder pages, `[slug]`, admin, portal, preview, APIs
   - **Page Builder data flow:** `AdminBuilderEditor` → sections/modules → DB → public render path
   - **Module types** and where each is edited vs previewed
   - **Site shell vs builder-owned nav** (no hardcoded nav in shell)

4. **Authentication & sessions**
   - Admin vs player auth, middleware behavior (especially JSON 401 for `/api/admin/*`)
   - Portal login/register flows and key cookies/session helpers

5. **Database & migrations**
   - How migrations are applied; relationship to `supabase/schema.sql` (note if out of sync)
   - Table groups: polls, players, blog, builder pages/templates, game events, **legacy game_reminders**, gallery/media, badges, etc.
   - RLS patterns the app relies on

6. **API surface**
   - Conventions: `{ data?, error? }`, `readAdminJson` / `parseAdminJsonResponse`
   - Group routes: `app/api/admin/*`, `app/api/player/*`, public poll/blog routes
   - List **high-traffic** routes with one-line purpose (table)

7. **Page Builder deep dive**
   - Adding a prop to a module (the three-file rule)
   - Style helpers (`builder-utils.ts`), preview vs live (`BuilderTemplatePreviewClient`, SSR notes)
   - Rich text: Tiptap, sanitization (`formatRichTextContent`, DOMPurify)
   - **Cardinal UI / BuilderSettingRow** — non-negotiable form layout rules

8. **Game layer & reminders (deep dive)**
   - End-to-end diagram: layout JSON → `BuilderReminderRuntime` → `/api/player/reminder-context` → `evaluatePlayerReminders` → UI components → localStorage dismissals
   - Criteria types, eval logic (`lib/game-reminder-eval.ts`, `lib/game-reminder.ts`, `lib/builder-reminder-module.ts`)
   - **Audience today:** `lib/game-audience.ts`, `GamePlayContext`, `gameAudienceFiresForContext`, module setting `gameAudience`, admin field `AdminGameAudienceField`
   - Diagnostics/dev tools (poll test mode, reminder diagnostics HUD) — how to enable and what they show
   - **Public game layer** (`lib/public-game-layer.ts`) vs reminders vs **Game Events** admin workspace

9. **Extension surface (for upcoming work)**
   - Proposed touch points for **richer audience selection** (builder settings UI, normalization, runtime context detection, game events parity, tests to add)
   - Known gaps, edge cases, and **anti-patterns** (e.g. reintroducing DB-backed reminder admin without product decision)
   - Test files that already cover audience (`lib/game-audience.test.ts`, `lib/module-game-audience.test.ts`)

10. **Blog, polls, player portal, gallery** — Shorter subsections: primary entry files, store/libs, public vs admin split.

11. **Styling & UX conventions** — `globals.css` prefixes, admin save buttons, CRUD tables, poll pods, link styling (no default blue underline), Title Case rules.

12. **Development workflow**
    - `npm run dev`, lint/test/typecheck commands that exist in `package.json`
    - Local Supabase pause/resume, `.next` cache clears, disk space pitfall
    - Admin fetch pitfalls (HTML error pages)

13. **Known issues / deferred work**
    - RTE gallery image insert still broken (document suspected code paths if found)
    - Any UNVERIFIED items from your audit

14. **Verification checklist for the next agent**
    - 10–15 concrete steps (URLs, builder actions, API curls) to confirm environment and understand reminders + audience

15. **File index (curated)** — ~40–80 **most important** paths with one-line roles (not every file in repo)

## Process requirements

- Explore the codebase systematically; do not rely only on `.cursorrules` or this prompt.
- Cite **file paths** when naming owners of behavior.
- When two systems sound similar (reminders vs game events vs legacy table), explain **which one is live**.
- If you find dead code related to legacy reminders, note it but do not delete unless asked.
- After writing the doc, run `npm test` and `npx tsc --noEmit` if available; note pass/fail in the doc footer.

## Output

1. Write the markdown file to the path above.
2. Reply with a **short summary** (bullets): what you documented, what you marked UNVERIFIED, and the top 5 files for the audience-extension work.
```

---

## After the agent runs

Expected output: [`Handoff - Normie Platform Architecture.md`](./Handoff%20-%20Normie%20Platform%20Architecture.md) (same folder).

Related: [Handoff - Normie Blog Public UI and Sidebar](../Cursor%20Threads/Handoff%20-%20Normie%20Blog%20Public%20UI%20and%20Sidebar.md) · [look-and-feel-compiled.md](../look-and-feel-compiled.md) · `.cursorrules`

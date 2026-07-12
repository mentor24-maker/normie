# Normie — Project Overview

*Personality polls for normal people.* Normie is a web platform where visitors
answer quick either/or personality polls, registered players turn that habit
into a points-and-rewards game, and an operator runs the entire experience —
content, pages, game rules, and community — from a built-in control room.

The site is live at **normie.one**, built on Next.js + Supabase, deployed on
Vercel, with an associated Solana utility token (**$NORMIE**).

Normie operates on three levels, each building on the one below it:

```
┌──────────────────────────────────────────────────┐
│  ADMIN CONTROL ROOM     (the operator)           │
│  content · pages · game design · users · team    │
├──────────────────────────────────────────────────┤
│  PLAYER PORTAL          (registered players)     │
│  points · levels · rewards · leaderboard · token │
├──────────────────────────────────────────────────┤
│  PUBLIC SITE            (everyone)               │
│  polls · blog · gallery · pages · sharing        │
└──────────────────────────────────────────────────┘
```

---

## Level 1 — The Public Site

What any visitor sees, no account required.

### The poll experience
The heart of the product. Visitors are served a stream of quick either/or
questions ("Would you rather be misunderstood or overlooked?") organized into
categories like *Identity & Psychology* and *Modern Life / Digital*.

- **Current Poll pod** — the active question; one tap to answer, and the next
  question appears. Anonymous visitors get a session cookie so their progress
  and answers survive page reloads — and can later be claimed by an account.
- **Previous Results pod** — after answering, visitors see how the community
  split on earlier questions, and can react (like/dislike) to polls they've
  answered.
- **Skip** is always available; skips are tracked separately from answers.
- **Deep dives** — a poll can carry an attached YouTube video, a related blog
  post, and links to related polls, turning a 5-second answer into a rabbit
  hole.
- **Share pages** — every poll has a standalone shareable page with social
  metadata, so a single question can be posted anywhere.
- **Interstitials** — between questions, the poll panel can show configured
  messages or micro-surveys (managed by the admin).

Poll collections include the standard catalog plus **Personality Type A/B/C**
question sets with per-question scoring metadata (trait dimensions, score
codes, weights) — groundwork for personality-profile features.

### Content & pages
- **Builder-driven pages** — most public pages (including the homepage) are
  not hard-coded; they're compositions built in the admin Page Builder and
  rendered live. The site's navigation, headers, and footers are themselves
  builder content.
- **Blog** — full publishing system: topics, categories, tags, related posts,
  SEO/OpenGraph metadata per post, and an RSS feed.
- **Gallery** — media library surfaced through builder pages.
- **Public player profiles** — every player has a public page at
  `/players/<handle>` showing their activity.
- **Merch** — product cards (Redbubble catalog) placeable on any builder page.
- **Standing pages** — About, Contact (working contact form), Roadmap,
  Tokenomics, White Paper, Privacy, and Terms.

### The token
$NORMIE is a Solana-based utility token (not an investment; the site carries
no financial advice). The public site explains tokenomics; token utility
surfaces inside the player portal.

---

## Level 2 — The Player Portal

What visitors unlock by registering (email + password, with email
confirmation and password reset flows). Registration is where the poll habit
becomes a game.

- **Claim your history** — anonymous answers made before registering can be
  linked to the new account, so nothing is lost.
- **Dashboard** — the player's home: current progression, active reminders,
  and the poll stream (playable right inside the portal).
- **Points** — every poll answered earns points; likes/dislikes on previous
  polls earn more. A transparent "How This Total Is Built" breakdown shows
  exactly where every point came from.
- **Progression** — points and activity advance the player through
  admin-designed progression tracks (Levels/Grades/Classes with named
  sublevels like Apprentice → Acolyte → Wizard). Level-ups trigger
  celebration events on the game board.
- **Rewards** — badges and collectible visual "discs" earned at tiers of
  progression, rendered with configurable styles (coin, jewel, ribbon, medal,
  trophy).
- **Progressive feature unlocks** — capabilities that switch on as a player
  advances, so the portal grows with the player.
- **Leaderboard** — top point earners across the community.
- **Poll history** — everything the player has answered, with the ability to
  revisit results.
- **Profile & preferences** — avatar, handle, display preferences; the public
  profile page draws from this.
- **Crypto wallets** — players can attach Solana wallet addresses and see
  their live $NORMIE balances (via Solana RPC) inside the portal.
- **Reminders & interstitials** — configurable nudges (speech bubbles, strips,
  popups) that fire on game criteria — e.g., "5 polls to your next level."

---

## Level 3 — The Admin Control Room

A protected workspace (`/admin`) where the operator runs everything. Access is
role-based (owner/admin roles with granular permissions), with a team-invite
flow for adding collaborators.

### Poll operations (`/admin/polls`)
- Full CRUD on polls: question, options, category, image, publish/hide state,
  deep-dive attachments (YouTube, blog post, related polls).
- **Bulk CSV import** — standard question sets and Personality Type A/B/C
  formats with scoring metadata; the 100-question starter set ships in the
  repo.
- Filtering, sorting, bulk delete/hide, orphaned-response purging, legacy
  data repair, and per-pod visual settings (colors, spacing, headers of the
  public poll pods).

### Page Builder (`/admin/builder`)
A full visual page-building system — the most substantial admin surface:
- **Pages and templates** (including *email* templates for auth mails) built
  from rows, columns, and 14+ module types: headings, rich text (Tiptap
  editor with fonts, shadows, outlines), quotes, buttons, images, sliders,
  navigation, headline rotators, tables, social icon sets, contact forms,
  code embeds, merch cards, and live poll modules (current poll / previous
  results / player portal).
- **Design controls** per section/cell/module: backgrounds (color, gradient,
  image), borders, padding, margins, drop shadows, alignment — all responsive,
  with a browser/mobile/email preview mode.
- **Reusable library** — save any module, cell, or entire section to a
  repository and reinsert it anywhere; clone anything in place.
- **Live preview** — a `/preview` page renders drafts exactly as the public
  site will.

### Game design (`/admin/game`)
The gamification economy is fully operator-configurable, no code required:
- **Progression tracks** — define levels, their order (drag-and-drop), and
  named sublevels.
- **Scoring rules** — what earns points and how many.
- **Level-up rules** — criteria for advancing (poll counts, scores, specific
  polls), per track and sublevel.
- **Level events** — what happens on the game board at each milestone.
- **Rewards/redemptions** — design the badge/disc catalog with bulk styling
  tools, tier copying, and visual previews.
- **Interstitials & reminders** — the between-poll messages and in-portal
  nudges, including micro-survey interstitials.

### Content & community
- **Blog workspace** (`/admin/blog`) — posts with the rich-text editor,
  taxonomy management, per-post SEO, publish workflow, and blog-wide design
  settings.
- **Gallery** (`/admin/gallery`) — media library with upload, bulk edit,
  filtering, marquee multi-select, and poll-image association.
- **Users** (`/admin/users`) — the player directory: profiles, stats
  (polls taken, points earned), tester designation (testers can be pinned to
  a specific poll for QA), and account management.
- **Team** (`/admin/team`) — operator accounts with roles and invitations.
- **Shop** (`/admin/shop`) — the merch catalog behind the public product
  cards.
- **Crypto holders** (`/admin/crypto`) — which players hold $NORMIE, wallet
  balances, USD values, with live price refresh.

---

## Under the hood (one paragraph for the curious)

Next.js 16 (App Router) + TypeScript on Vercel; Supabase (Postgres) for data,
auth, and storage; custom global CSS (no UI framework); Tiptap for rich text.
The codebase completed a full engineering overhaul in July 2026: CI-gated
merges (typecheck, lint, 400+ tests, dependency audit, schema-drift guard),
rate-limited and audited API surface (~90 routes), decomposed components, and
a Docker-based local development stack fully isolated from production. See
`docs/Handoffs/` and `CLAUDE.md` for the engineering record.

## Data commitment

Individual user data is **never sold**. Only aggregate, anonymized results
are ever shared — a commitment reflected in the privacy policy and enforced
as a rule of the codebase.

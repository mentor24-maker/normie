# Handoff — Normie Blog Public UI and Sidebar

**Repo:** `~/WebApps/normie`  
**Product:** Normie (public site + admin)  
**Thread date:** 2026-05-19  
**Human:** Mentor (pausing here; **Codex** takes over Normie; Cursor returns to **StarCaster**)  
**Prior transcript:** [Normie blog public UI](111bddb6-d24d-4f1d-9999-dad4518bd267) (Cursor agent transcript)

---

## 1. What this thread was about

Public-facing **Normie blog** (`/blog` and `/blog/[topicSlug]/[postSlug]`) — layout, styling, filters, builder-driven header, and a visitor sidebar with taxonomy navigation and auto-related posts.

| Area | Outcome |
|------|---------|
| **Blog index** | Two-column card grid, excerpts, date line, topic/category chips linking to filtered `/blog?…`, filter dropdowns synced to URL via `useSearchParams` + `router.replace` |
| **Blog layout chrome** | Builder saved sections **“Blog Header”** and **“New Main Menu”** loaded from Supabase (with public RLS migration) |
| **Single post styling** | Date on its own line (`.blog-card-date`), headline `.blog-post-title` with `clamp(1.1rem, 2vw, 1.4rem)` and `30px` top margin; global `h1` override via specific selector |
| **Sidebar (post + home)** | `BlogPostSidebar` — Related Posts (3, taxonomy priority), Categories, Topics, Tags; shared `blog-post-layout` grid |
| **Related posts logic** | `listPublicBlogSidebarRelatedPosts()` — tag → topic → category fill, excludes current post |
| **Scrolling** | Removed `position: sticky` on sidebar so main column and sidebar scroll together |
| **Blog home sidebar** | Same sidebar on `/blog`; Related Posts section hidden (`showRelatedPosts={false}`) |

**Not in scope this thread:** StarCaster repo changes, admin blog editor UX beyond incidental references, blog index hero copy (removed earlier).

---

## 2. Where to start (next agent — Codex on Normie)

1. Open workspace: **`~/WebApps/normie`** (not StarCaster).
2. Read **`.cursorrules`** if present; main styles live in **`app/globals.css`** (no Tailwind on public blog).
3. Run dev: `npm run dev` → **http://localhost:3000**
4. Verify **two URLs**:
   - Index: `http://localhost:3000/blog`
   - Post: click any card → `/blog/{topicSlug}/{postSlug}` (sidebar shows Related Posts + taxonomy)

**Do not confuse with StarCaster:** StarCaster (`~/WebApps/starcaster`) is the Alphire ops platform. Normie is a separate Next.js app.

---

## 3. Key files

| Path | Role |
|------|------|
| `app/blog/page.tsx` | Blog index (SSR list + taxonomy) |
| `app/blog/layout.tsx` | `BlogHeader` + `BlogMainMenu` + children |
| `app/blog/[topicSlug]/[postSlug]/page.tsx` | Post page + sidebar + sidebar related fetch |
| `components/blog-index-client.tsx` | Filters, cards, load more, index layout + sidebar |
| `components/blog-post-sidebar.tsx` | Sidebar UI; `showRelatedPosts` optional |
| `components/blog-post-body.tsx` | Sanitized HTML body |
| `lib/blog-store.ts` | `listPublicBlogPosts`, `listPublicBlogTopicsAndTags`, `listPublicBlogSidebarRelatedPosts`, `getPublicBlogPost` |
| `lib/blog.ts` | Paths, `getBlogTaxonomyFilterPath`, card types, SEO helpers |
| `lib/builder-site-modules.ts` | Loads saved sections by name |
| `src/site/blog/blog-header.tsx` | “Blog Header” saved section or fallback |
| `src/site/blog/blog-main-menu.tsx` | “New Main Menu” saved section |
| `app/globals.css` | `.blog-*`, `.blog-post-layout`, `.blog-post-sidebar`, `.blog-sidebar-*` |
| `supabase/migrations/004_builder_library_public_read.sql` | Anon read for builder sections (required for public header) |

---

## 4. Layout and CSS notes

### Shared grid

```css
.blog-post-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 300px);
  max-width: 1180px;
  /* … */
}
```

- **Main column:** `.blog-index` or `.blog-post-page` (`min-width: 0`).
- **Sidebar:** `.blog-post-sidebar` — **not sticky** (scrolls with page).
- **≤900px:** single column; sidebar stacks below main content.

### Post headline specificity

Global `h1 { font-size: clamp(3rem, 6vw, 5.8rem); }` still exists. Post titles must use:

`.blog-post-page .blog-post-header h1.blog-post-title`

If headline size changes “don’t apply,” check DevTools for losing specificity to global `h1`.

### `clamp()` reminder

`clamp(min, preferred, max)` — middle value often hits min/max on typical viewports; small tweaks to min/max may look unchanged until you check computed size in DevTools.

---

## 5. Related posts algorithm

**Function:** `listPublicBlogSidebarRelatedPosts(post, 3)` in `lib/blog-store.ts`

1. Posts sharing any **tag** with the current post (newest first).
2. If fewer than 3, fill from shared **topic** ids (includes `primaryTopicId`).
3. If still fewer than 3, fill from shared **category** ids (includes `primaryCategoryId`).

**Manual related** (`blog_post_related_posts` / editor picks) is still loaded in `getPublicBlogPost` as `related` but the **bottom “Related posts” grid was removed** from the post template in favor of sidebar auto-related. Re-enable or merge if product wants both.

**Blog home:** Sidebar hides Related Posts (`showRelatedPosts={false}`). Optional follow-up: show “Recent posts” (first 3 of current filter) on index.

---

## 6. URL filters (blog index)

- Chips and sidebar links → `/blog?topic=`, `?category=`, `?tag=`.
- Dropdowns read **`useSearchParams()`**; changes use **`router.replace(..., { scroll: false })`**.
- `app/blog/page.tsx` has `export const dynamic = "force-dynamic"` and wraps client in **`Suspense`** for `useSearchParams`.

---

## 7. Builder header requirements

Saved section names must match exactly:

- **`Blog Header`** — saved **section** (not cell module)
- **`New Main Menu`** — saved section

Without Supabase RLS + published sections, layout falls back to legacy `blog-site-header` HTML.

---

## 8. Completed checklist

- [x] Blog index two-column grid, card structure, taxonomy chip links
- [x] Filter dropdowns reflect URL query params
- [x] Post page date line + headline sizing/margin
- [x] Sidebar on post pages with taxonomy lists
- [x] Auto-related posts (tag → topic → category)
- [x] Sidebar on blog home; main grid shifted left in shared layout
- [x] Sidebar scrolls with page (sticky removed)
- [x] Sidebar component styles in `globals.css`

---

## 9. Open / suggested follow-ups

| Item | Notes |
|------|--------|
| **Related Posts on home** | Optionally show 3 recent/filtered posts in sidebar |
| **Manual + auto related** | Decide whether editor-picked related posts should appear alongside auto sidebar list |
| **Sidebar on narrow mobile** | Currently stacks below content; confirm order (sidebar after article) is desired |
| **Tag links on post body** | Post footer still has tag chips; sidebar duplicates taxonomy navigation |
| **Performance** | `listPublicBlogTopicsAndTags()` on every post view; consider caching if lists grow large |
| **Tests** | No new tests added for sidebar related logic |

---

## 10. Common pitfalls

1. **Testing only `/blog`** — Sidebar does not appear meaningfully until you confirm layout on a **post URL**; home hides Related Posts section.
2. **Headline CSS “not updating”** — Global `h1` rule; use `.blog-post-title` selector; hard refresh.
3. **Wrong repo** — Normie paths are under `~/WebApps/normie`, not `starcaster`.
4. **Builder header missing** — Check Supabase section names and `004_builder_library_public_read.sql` applied.
5. **Dev server logs** — `GET /blog 200` only means index loaded; post route compiles as `/blog/[topicSlug]/[postSlug]`.

---

## 11. Paste-ready prompt for Codex (new thread)

```
Continue Normie public blog work from:
docs/Cursor Threads/Handoff - Normie Blog Public UI and Sidebar.md

Workspace: ~/WebApps/normie
Dev: npm run dev → http://localhost:3000/blog

Context: Blog index and post pages use blog-post-layout (main + sidebar). Sidebar has Categories, Topics, Tags; Related Posts (3) on post pages only, matched by tag → topic → category. Sticky sidebar was removed so everything scrolls together.

Pick up from §9 open items or my next instruction below:
[Paste your task here]
```

---

## 12. StarCaster handoff note

Mentor is switching Cursor back to **`~/WebApps/starcaster`** for Alphire platform work. Normie changes in this thread are **committed only in the Normie working tree** — verify `git status` in Normie before assuming anything is pushed.

For StarCaster orientation, see `~/WebApps/starcaster/docs/Cursor Threads/Handoff - Alphire Starcaster orientation.md` and `docs/AI_AGENT_HANDOFF.md`.

---

*End of thread handoff.*

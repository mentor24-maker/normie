# Normie look & feel — compiled from conversation

Draft for review. Merge refined items into `.cursorrules` → **Style Guide** and into `app/globals.css` as needed.  
Sources: project chat transcript (audit through poll settings, blog, header, shop, email). Functional/security-only requests are omitted unless they affected UI.

---

## Typography & labeling

- **Title Case** for headlines, buttons, and similar UI chrome (e.g. `Save Settings`, not `Save settings`).
- Blog post headings were **too large** on the public post view — reduce controlled heading sizes.
- Invite email tagline **“Where Average is Awesome!”** should match home page font treatment, including drop shadow.
- Blog index filters must **fit on one line** (three filters).

---

## Buttons (general)

- **Do not let button labels word-wrap** (e.g. `Save Settings` must stay one line).
- Buttons should be **width of text + horizontal padding**, not full width (unless layout requires).
- **Bold font** on buttons.
- **Center** primary actions when requested (bulk delete, add category/tag/topic).
- **Add** buttons: green gradient style (same as Save Post / admin add pattern).
- **Save Post**: use the same green as add buttons.
- **Bulk delete**: red background, white text, centered at bottom of list.
- **Publish** icon: green. **Delete** icon: red. **Edit** icon: first in action list.
- CRUD **Actions** columns: **icons only**, no text labels (starting with Blog posts).
- Answer settings A/B columns: **`>>` control** between columns to copy A → B.

---

## Admin notices & forms

- **Error notices**: pink background, 2px dark red border, dark red text.
- **Success notices** (e.g. “Poll settings saved.”): light green background, dark green border, text same color as border (mirror error style in green).
- Builder section editor: **do not let settings overlap** each other.
- Section editor: separate **Top margin** and **Bottom margin** (not a single vertical margin).

---

## Colors & brand accents

- Blog link color: **`#1DC3FF`**.
- Invite email button: **`#12BDF4`**.
- Poll header background iterations: lighter logo blue → **`#42C8F9`** → **`#5ACFF9`** (current default direction).
- Poll header font: **dark turquoise** compatible with header background.
- Blog header tagline: **same purple as home page**.
- Blog header: **attractive green gradient** background (replacing plain white at one point).
- Email invite: **grass green gradient** behind header; 50px radius container; logo left, tagline right.

---

## Layout, spacing & alignment

- **Public home page**: reduce top margin above header/social area — **no more than ~10px** above social icons (builder section margins were the lever).
- Blog header: **20px left/right margin** inside pod; logo aligned with main body.
- Blog header: **three columns** (logo | tagline center | social) to prevent overlap; tagline in center **without adding header height**; later **tagline removed**; restore padding; green gradient background.
- Merch module: product text **centered**.
- Poll slider: **equal height** for Current Poll and Previous Results pods.
- **~100px margin** between the two poll pods (horizontal gap in poll grid).
- Poll **question/content width** (67%, etc.): **left-aligned**, not centered; applies to **both** Current Poll and Previous Results content areas.
- “Choose one option to move to the next poll.” — **remove** from Current Poll module.
- Category heading row: **own row** so poll and results columns stay aligned.
- Investigate/fix **excess vertical spacing** between polls section and “Share this poll” (builder layout).

---

## Poll pods & poll settings

- Current Poll / Previous Results modules: **transparent** panel background (page/section shows through); styling via Poll Settings.
- Poll boxes should **“pop”** more: header padding, larger header font, colored header pill.
- Header pill: keep **`border-radius: 999px`** so when height grows it still reads as a **rounded box**, not a thin pill — **do not shrink radius** when increasing height.
- Poll settings structure: four pod types — **Polls**, **Previous Results**, **Initial Page**, **Interstitial** — each with layout + clone between types.
- **Initial Page** (was “no prior poll” / How It Works): rich text message; **remove “How It Works” eyebrow** label.
- Polls pod: narrower content width to leave room for **right-aligned background image** (future/now: image + gradient background options per pod).
- Layout forms: **pod corner radius**, **header corner radius** (999 = pill).
- Answer buttons: full styling including **font size** per A/B.

---

## Header & navigation (site)

- Match live **normie.one** header: **social icons upper right** (not Login); **remove menu** from header; add **Blog** link.
- Social icons were **badly shrunken** — fix display size.
- Wrap header in **pod container**, white background (later green gradient on blog variant), logo lines up with body.

---

## Blog (public & admin)

- Do not show **description/excerpt on blog tiles**.
- Tags admin: **three columns**, fill 1→2→3 in turn.
- Tags/categories/topics: inline edit on click; checkbox + bulk delete; remove redundant Edit button.

---

## Shop & product UI

- Product gallery modal: **working scrollbar** (not stuck at 15 images).
- Product gallery modal: **search field** at top.
- Products table: **sortable** column headers; URL column shows **product slug** only (e.g. `acrylic-block`), linked; image **50×50 thumbnail** with full-size popup; filter bar (name, URL, type).

---

## Email

- Invite email: pretty container, **50px radius**, logo + tagline header row, styled CTA button.

---

## Embeds / code modules (Tokenomics)

- Dexscreener embed: should not be over-constrained; yellow background bounded by green border; “Load Chart” headline above icon; larger icon (session-specific layout fixes).

---

## Open / later (mentioned, not fully specified)

- Interstitial pod content on site (admin config started; front-end flow later).
- Background images behind poll pods (implemented as pod background mode: image + gradient + position).
- Further poll appearance fields as needs arise.

---

## Suggested next Style Guide entries (from this pass)

After your review, promote stable rules into `.cursorrules`:

1. Title Case for UI chrome.  
2. No button label wrapping.  
3. Notice color pairs (success green / error red).  
4. Poll pod transparency + settings-driven appearance.  
5. Left-aligned poll content width.  
6. Icon-only CRUD actions with green publish / red delete.  
7. Green add/save vs red destructive button pattern.

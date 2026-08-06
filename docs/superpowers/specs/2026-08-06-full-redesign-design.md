# Full Redesign — "TRAILBLAZE" Layout Reference

**Date:** 2026-08-06
**Status:** Approved design (brainstorming complete)
**Scope:** Visual/structural redesign of the entire app to follow the "TRAILBLAZE" statistics reference layout. Bahasa Indonesia UI. Mobile bottom bar retained. Dark mode + all functionality preserved (no RLS/query/dialog/toast changes).

## 1. Reference & Decisions

The user supplied a reference HTML (TRAILBLAZE Statistics page) with: desktop sidebar w/ profile header + nav links + CTA, hero header + range filter chips, 4 KPI stat cards, and a 2:1 bento grid (line chart + funnel + source list).

Decisions confirmed with user:
- **Scope C** — redesign all pages (not just `/statistik`).
- **Approach A** — build the design system once (tokens + components), then apply to each page.
- **Mobile** — keep the existing bottom bar nav; desktop sidebar redesigned per reference.
- **Language** — Bahasa Indonesia throughout.
- **Range filter** — 7 Hari / 30 Hari / Semua Waktu actually recompute all numbers server-side.
- **Data** — allowed to add queries to `lib/stats.ts` (streak, rejections, funnel, per-range).

Fonts already installed: `Unbounded` (display), `Plus_Jakarta_Sans` (body), `IBM_Plex_Mono` (mono). Tokens already exist: `trailblaze`, `moss`, `denim`, `ember`, `paper`, `surface`, `ink`, `stone`, `line`, `shadow-card`. Only additive changes needed.

## 2. Design System Foundation

### Typography roles (CSS variables as Tailwind utilities)
All fonts already loaded in `app/layout.tsx` (`--font-display`, `--font-jakarta`, `--font-mono`). No new fonts.

| Role | Font/Style |
|------|-----------|
| `display-lg` | Unbounded 48/1.1 bold, tracking-tight — page hero titles |
| `display-sm` | Unbounded 32/1.2 bold — brand, big numbers |
| `headline-md` | Unbounded 24/1.3 — chart card titles |
| `headline-sm` | Unbounded 18/1.4 — small card titles |
| `stat-lg` | IBM Plex Mono 24 — stat numbers |
| `label-mono` | IBM Plex Mono 14 uppercase tracking — chips, column labels |
| `body-md` / `body-lg` | Plus Jakarta Sans 16/18 — body & description |

Tailwind utilities exist for font-family (`font-display`, `font-mono`) but NOT for these specific size roles. Add size tokens to `@theme` so `text-display-lg` etc. work, OR define component classes. Decision: **add font-size tokens in `@theme`** (`--text-display-lg`, `--text-display-sm`, `--text-headline-md`, `--text-headline-sm`, `--text-stat-lg`, `--text-label-mono`, `--text-body-md`, `--text-body-lg`) so `text-display-lg`, `text-stat-lg`, `text-label-mono`, etc. become usable utilities.

### Components (new, in `src/components/`)
- **`PageHeader`** — hero title (display-lg) + description + optional action slot (right-aligned, e.g. filter chips or CTA buttons).
- **`StatCard`** — KPI card: top row = mono-uppercase label + icon; middle = big mono number + small delta/unit; bottom = subtle progress bar (track `bg-surface-variant`, fill brand color). Hover: translateY(-2px) + stronger shadow. Optional solid variant (brand background w/ watermark icon) for streak.
- **`Card`** — generic wrapper: title (headline) + optional menu/action + body. `bg-surface`, border, `rounded-xl`, `shadow-card`.
- **`Sidebar`** — rewrite of `nav.tsx` desktop aside per Section 3. Bottom mobile bar unchanged.
- **`RangeFilter`** — pill chips 7 Hari / 30 Hari / Semua Waktu. Active: `border-trailblaze bg-trailblaze/10 text-trailblaze font-bold`; inactive: bordered, hover. Client-side state.

### Card language (already established, keep)
`bg-surface` + `border border-line` + `rounded-xl` + `shadow-card`; `bg-surface-variant` for empty tracks/bars. `.field`, `.btn-primary/secondary/ghost`, `.card` classes from the DESIGN alignment phase remain in use.

## 3. Sidebar (rewrite `src/components/nav.tsx`)

Desktop (`md:flex`) fixed left, `w-64` expanded / `w-[4.5rem]` collapsed; `--nav-w` follows. Transition width 200ms. Keep mobile bottom bar exactly as-is (5 items, grid-cols-5).

Structure top→bottom:
1. **Brand** — trailblaze dot/icon + "Lamaranku" Unbounded tracking-tight, two-tone (trailblaze + ink). Collapsed: dot only.
2. **Profile header** — rounded avatar (initial char, `bg-trailblaze/15 text-trailblaze`), name (Unbounded), mono row "🔥 N hari streak" (trailblaze bold), secondary line = target role or email fallback. Border-bottom. Data from `profiles` (full_name, target_role) — passed via server layout; fallback to email initial.
3. **Nav links** — 5 items: Dashboard, Lamaran, Sumber, Statistik, Akun. Icon (lucide, `fill`/stroke style — active = filled/2.5 stroke), active `bg-trailblaze/15 text-trailblaze`, inactive `text-stone hover:bg-surface`. Collapsed: icon centered, title tooltip.
4. **CTA bottom** — full-width "Tambah Lamaran" → `/lamaran/baru`, `bg-trailblaze text-white`, hover brightens, plus icon. Collapsed: icon-only centered.
5. **Utilities** — ThemeToggle, collapse toggle, "Keluar" (ember, opens ConfirmDialog — existing). Logout mobile stays on Akun page (confirm dialog already added).

Profile data flow: `layout.tsx` (server) fetches `profile` via existing `getCurrentUser()`/profile query and passes to `Sidebar` props. No new client query needed for sidebar.

## 4. Statistik Page (`/statistik`)

`statistik/page.tsx` renders initial stats for range `'30d'` (default). `StatistikClient` (client) owns the active range state, passes it as a prop to each section, and refetches by calling the server action `getStats(range)` through TanStack Query (queryKey includes range). On refetch success it renders fresh data. This is the smallest consistent mechanism and reuses the existing TanStack Query setup.

### Header
Hero title "Kinerja" (display-lg) + description (body, max-w-2xl). Right: `RangeFilter` chips.

### KPI row (grid 1/2/4 cols)
1. **Total Lamaran** — icon send, big mono number, delta optional, trailblaze bar.
2. **Interview** — icon forum/comment, moss bar. Count = applications whose current_status is HR Interview / Technical Interview (or reached any interview stage in range).
3. **Rejected** — icon cancel, ember bar. Count = current_status 'Rejected' in range.
4. **Streak** — solid trailblaze card, flame watermark, "N Hari", subtext "Pertahankan!".

### Bento grid (2:1)
- **Left col-span-2 — "Momentum Vector"** (growth chart): chart.js Line, area gradient, trailblaze line + dots, grid overlay style, current point pulse. Title headline-md "Kemiringan Lamaran" + body subtitle. X labels = weeks (or days for 7d).
- **Right column (2 stacked cards):**
  - **"Funnel Velocity"** — horizontal bars per stage: Applied → Screening → HR Interview → Technical Interview → Offer → Accepted. Each row: mono label + mono count, track + gradient fill (primary→moss→denim→tertiary→stone). Show % maybe.
  - **"Origin Vectors"** — source list: dot (brand color per source) + name + mono %. Replace chart.js Doughnut with this list (reference style).

### Components
`StatCard` (reused), `MomentumChart` (line), `Funnel` (bars), `SourceList`. All `stat-card` hover.

## 5. Other Pages (structure + tokens)

All pages get `PageHeader` + `Card`-based sections. No functional changes. Detail per page:

**Dashboard** (`dashboard/page.tsx`):
- Hero "Lamaranku" + description.
- KPI row (compact): Total Lamaran, Follow-up (next_follow_up_date due), Streak. Use `StatCard`.
- "Aktivitas Terbaru" compact list (existing `LamaranList` compact) + "Tambah" CTA.

**Lamaran list** (`lamaran/page.tsx` + `lamaran-list.tsx`):
- Hero. Search + filter bar (`.field`, selects). List/table `shadow-card`, mono-uppercase column labels, row hover. Pagination, RowActions, ConfirmDialog, bulk bar unchanged.

**Detail** (`lamaran/[id]/page.tsx`): hero company name Unbounded + status badge; sections Detail / Deskripsi / Catatan / Riwayat via `Card`, mono labels.

**Form** (`lamaran/baru` + `[id]/edit`): hero; form in `Card`; `.field` inputs; `btn-primary` submit; error Modal + toast retained.

**Sumber** (`sumber/*`): hero; add-source card + list via `Card`; edit/delete icons + ConfirmDialog retained.

**Akun** (`akun/*`): hero; avatar card + profile form in `Card`; mobile logout (ember + ConfirmDialog) retained.

**Sign-in** (`sign-in/page.tsx`, `sign-in/code/page.tsx`): token alignment (`.btn-primary`, label-mono where fitting), no structural change.

## 6. Data Layer (`lib/stats.ts`)

Extend `getDashboardStats` to accept `range: '7d' | '30d' | 'all'` and return:

- `total` — count of applications in range
- `interviews` — count with interview status in range (current_status in [HR Interview, Technical Interview])
- `rejected` — count current_status = 'Rejected' in range
- `streak` — consecutive days with ≥1 application, counting backward from **today** (a day with 0 applications breaks the streak; a gap before today also breaks it). 0 if no applications. Implemented in JS by building a `Set` of ISO dates from `applied_date` and walking back day-by-day.
- `growth` — per-period counts (weeks for 30d/all, days for 7d)
- `successRate` — funnel: % per stage reached (from `application_status_history`)
- `distribution` — source name → count/%

Keep `dynamic = 'force-dynamic'`.

Rejection/streak/interview counts come from existing `job_applications` data — no schema change. Streak computed in JS from `applied_date` (data set is small; no SQL window functions needed — ponytail: JS is fine).

## 7. Non-Goals / Preserved Behavior

- No changes to: RLS, DB schema, server actions semantics, ConfirmDialog/Toast/error-Modal behavior, dark-mode mechanics, TanStack Query flows, auth.
- No new dependencies. chart.js + react-chartjs-2 already installed and reused.
- Keep `.field`/`.btn-*`/`.card` from prior DESIGN phase; they stay the base, this phase layers role typography + new components.
- No commit (user: "jgn dulu di commit").

## 8. Risks / Notes

- `--nav-w` currently 13rem; sidebar becomes 16rem expanded → update `--nav-w` to match to avoid layout jump. (Prior review flagged width duplication; this phase sets sidebar + var from one source.)
- Stats page range refetch: avoid over-engineering — one server action, TanStack Query, or simple `router.refresh` + searchParams. Implementation plan decides smallest.
- Streak edge cases: **today with 0 applications breaks the streak immediately** (definition above); no applications ever → 0. Precisely defined in Section 6.
- Font size tokens in `@theme` must not collide with existing `--text-*` usage (verify none exist).

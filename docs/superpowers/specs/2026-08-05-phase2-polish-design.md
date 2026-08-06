# Phase 2 Polish — Job Application Tracker

**Date:** 2026-08-05
**Status:** Approved design (not yet implemented)

## Objective

Polish the existing Phase 1 MVP into a more usable, better-looking app:
dedicated Lamaran page with full CRUD, dashboard recent activity, centered
modal for Sumber edits, richer Akun page with a profiles table, collapsible
sidebar with logout + dark mode, and an autosizing textarea for long job
descriptions. Single-user app, mobile-first, web view adapts.

## Constraints

- Keep the single-user auth model (OTP email, `auth.uid()` RLS).
- No new third-party dependencies unless required. Dark mode and modal are
  built with existing tooling (Tailwind v4, React).
- Do not leak anything in production: no service-role key in the client, all
  data access session-scoped + RLS.
- Efficient queries: pagination, `limit`, indexed filters.
- Do not commit until user approves (user: "jgn dulu di commit").

## 1. Architecture

### Navigation

- Desktop: fixed left sidebar, collapsible to an **icon-only rail** (~64px).
  - Items: Dashboard, Lamaran, Sumber, Statistik, Akun.
  - Wordmark "Lamaranku" at top: larger font-display, bold, **2-tone**
    (trailblaze + ink) — text-based, no logo asset.
  - **Logout** at the bottom of the sidebar (desktop).
  - **Collapse toggle** button; state persisted in localStorage, applied to
    the `<html>`/layout via a client component.
- Mobile: bottom tab bar (existing pattern) — no room for logout; logout
  remains on the Akun page on mobile only.
- The `(app)` layout currently does `md:pl-56` for the fixed sidebar; the
  collapsed rail needs a smaller left offset (`md:pl-16`), so the layout must
  know the collapsed state. Nav becomes a client component that owns the
  collapsed state and renders both the sidebar and the layout padding.

### Data layer

- New table `public.profiles`:
  - `id uuid primary key references auth.users(id) on delete cascade`
  - `full_name text`, `target_role text`, `linkedin_url text`,
    `portfolio_url text`, `salary_expectation numeric`, `phone text`
    (`phone` column exists but is **not** used in the UI yet)
  - `updated_at timestamptz not null default now()`
  - RLS: `using (auth.uid() = id) with check (auth.uid() = id)`
  - Trigger `seed_default_profile()` on `auth.users` insert (same pattern as
    `seed_default_sources`).
- Existing tables unchanged (`sources`, `job_applications`,
  `application_status_history`).

## 2. Components

### `LamaranList` (reusable, single source of truth)

One component serving both the full `/lamaran` page and the dashboard's
"recent activity" card via a `variant`/`compact` prop.

**Full variant (`/lamaran`):**
- Header: title "Lamaran" + **Tambah Lamaran** (→ `/lamaran/baru`) + **Impor**
  (→ `/lamaran/import`).
- Search bar (company/role, debounced 350ms), status filter, source filter.
- Desktop table / mobile card list (existing `DashboardList` patterns).
- **Three-dots action per row** → menu: Lihat (→ `/lamaran/[id]`), Edit
  (→ `/lamaran/[id]/edit`), Hapus (confirm). Keep bulk-select checkboxes.
- Pagination 15/page, prev/next + "Hal X / Y", sort `applied_date desc`.
- Client component using React Query + `range()` pagination (as today).

**Compact variant (dashboard):**
- Renders 5 latest applications (server-rendered fetch, `limit(5)`, order
  desc) as a "Aktivitas Terbaru" card: company, role, status badge, date.
- Click item → `/lamaran/[id]`; "Lihat semua" → `/lamaran`.
- No search/filter/pagination/actions.

### `Nav` (rewrite)

- Client component; owns `collapsed` state (localStorage).
- Sidebar + mobile bottom bar + layout padding offset.
- Wordmark, collapse toggle, logout (desktop).
- Dark-mode toggle button (see below).

### `Modal`

- Small reusable centered modal: backdrop overlay + panel (`max-w-sm`,
  mobile near-full width, desktop centered). Used for Sumber edit (replaces
  the current inline `<details>` dropdown) and, where sensible, delete
  confirm.

### `ThemeToggle`

- Sun/moon button. Located in the sidebar (desktop) and mobile drawer.

## 3. Pages

### `/lamaran` (new)

- Server component that loads `sources` and renders the full `LamaranList`.
- Data fetched client-side via React Query (existing pattern).

### Dashboard

- Keep streak trail + two stat cards (Total lamaran, Perlu ditindaklanjuti).
- Replace full `DashboardList` with the compact "Aktivitas Terbaru" card
  using `LamaranList` compact variant.
- Recent activity = 1 server query (`limit(5)`).

### Sumber

- Add-new source card stays.
- **Edit** opens the centered `Modal` (inline `<details>` dropdown removed).
- Delete stays inline with confirm.

### Akun

- Header: initial avatar + **full_name** (editable) + email (read-only).
- Profile form: full_name, target_role, linkedin_url, portfolio_url,
  salary_expectation — saved to `profiles` via server action.
- `phone` column exists in DB but is not editable/displayed in UI.
- Logout button present only on mobile.

## 4. Dark mode

- Token refactor: replace hardcoded `bg-white`, `text-ink`, `bg-paper`,
  `bg-stone/...`, etc. with semantic CSS variables:
  `--surface`, `--surface-muted`, `--border`, `--text`, `--text-muted`,
  `--bg`. Light values in `:root`, dark values in `.dark`.
- Tailwind v4 `@theme inline` maps tokens to `--color-*` (bg-surface,
  text-text, border-border, etc.).
- Inline script in `<head>` sets `.dark` from `prefers-color-scheme` or
  saved override (localStorage) before paint (no FOUC).
- Toggle updates localStorage + class. Default follows system; user override
  persists.
- All components (charts, streak, lists, forms) use tokens so both modes
  stay consistent.

## 5. Form improvement

- `application-form.tsx`: textarea **autosize** for `job_description`
  (min ~6 rows, grows to ~30, then scroll) and `notes`. Plain text, no HTML;
  detail page keeps `whitespace-pre-wrap`.

## 6. Security & RLS

- No service-role key in client code; all reads/writes go through the
  session-scoped client (server: `serverDb()` via `@insforge/sdk/ssr` +
  cookies; browser: `createBrowserClient()`). RLS `auth.uid()` is the
  enforcement layer.
- `profiles` RLS mirrors `sources` (using + with check on `auth.uid() = id`).
- Server actions validate input (trim, require user, whitelist fields)
  before querying.
- List queries use existing indexes (`company_name gin_trgm_ops`, status,
  applied_date desc); pagination via `range()`.
- User text rendered plain (no HTML injection). URLs sanitized to `http(s)`
  before rendering as `<a>`.
- Env: `NEXT_PUBLIC_INSFORGE_URL` + `NEXT_PUBLIC_INSFORGE_ANON_KEY` set in
  production. No new public secrets.

## 7. Efficiency

- Dashboard: 1 query for recent activity (`limit(5)`).
- `/lamaran`: React Query + `range()` pagination, refetch on filter change.
- No duplicated/avoidable queries between pages.

## 8. Testing / verification

- `npm run lint` + `npm run build` pass.
- Manual smoke test: OTP login; add/edit/delete application; filter +
  pagination on `/lamaran`; dashboard recent activity; Sumber edit via modal;
  Akun profile update; dark mode (system default + override + persistence).
- RLS verification: confirm a request as a different user returns no rows
  (via anon key / InsForge dashboard).

## Files touched (expected)

- `src/components/nav.tsx` (rewrite), `src/app/(app)/layout.tsx`
- `src/components/lamaran-list.tsx` (new, replaces `dashboard-list.tsx`)
- `src/app/(app)/lamaran/page.tsx` (new)
- `src/components/modal.tsx` (new)
- `src/app/(app)/sumber/page.tsx` (edit via modal)
- `src/app/(app)/akun/page.tsx` + `src/app/(app)/akun/actions.ts` (new)
- `src/lib/types.ts` (Profile type)
- `src/components/application-form.tsx` (autosize textarea)
- `src/app/globals.css` (tokens + dark theme), `src/app/layout.tsx` (FOUC script)
- `sql/profiles.sql` (new migration; user runs in InsForge SQL editor)

## Out of scope

- Custom domains/slug changes.
- Phone number functional flow (column only).
- Multi-user features, OAuth, file storage.
- Anything beyond the listed polish items.

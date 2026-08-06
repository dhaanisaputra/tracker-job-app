# Align UI to DESIGN.md

Date: 2026-08-06

## Problem

The UI styling deviates from the official design system in `DESIGN.md` (Momentum Tracker):

1. **Modals are centered on all screen sizes** — DESIGN.md requires bottom sheets on mobile.
2. **Input focus state** uses `focus:border-trailblaze` (1px border color swap) — spec wants a 2px Trailblaze focus ring.
3. **Button variants** are ad-hoc — spec defines Primary (solid Trailblaze), Secondary (1px Stone border + Ink), Ghost (borderless, for cancel).
4. **No elevation** — cards are flat border-only; spec defines a subtle level-2 shadow.

Already compliant (no change): brand colors (trailblaze/moss/denim/ember/paper/stone), fonts, status badges (pill + 10% tint), 8px spacing.

## Decisions

- Single-pass sweep driven by CSS utility classes in `globals.css`; no new dependencies.
- Responsive `Modal`: bottom sheet on mobile, centered on desktop.
- Reusable `.field` input utility and `.btn-primary`/`.btn-secondary`/`.btn-ghost` button utilities; sweep all call sites to use them.
- Cards/dropdowns get a soft elevation shadow token while keeping the 1px border.

## Changes

### 1. `src/app/globals.css`

- Add elevation shadow token: `--shadow-card: 0 4px 20px rgba(32, 30, 27, 0.04)` (light) and a slightly stronger dark-mode variant.
- Add component utilities under `@layer components`:
  - `.field` — the shared input class: `w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:ring-2 focus:ring-trailblaze focus:border-transparent`.
  - `.btn-primary` — `inline-flex items-center gap-1 rounded-lg bg-trailblaze px-4 py-2 text-sm font-semibold text-white hover:opacity-90`.
  - `.btn-secondary` — `inline-flex items-center gap-1 rounded-lg border border-stone/40 px-3 py-2 text-sm font-medium text-ink hover:bg-stone/10`.
  - `.btn-ghost` — `inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-stone hover:bg-stone/10`.
  - `.card` — `rounded-xl border border-line bg-surface p-4 shadow-card` (elevation + border). Optional padding override via modifiers is NOT needed; keep per-site padding inline.

### 2. `src/components/modal.tsx` — responsive bottom sheet

- Mobile (`< md`): panel anchored to bottom, full width minus 16px gutters, `rounded-t-2xl`, drag handle (8x3 rounded bar centered at top), `max-h-[90dvh]` with internal `overflow-y-auto`, slide-up animation (`translate-y` transition), backdrop `bg-black/50` + `backdrop-blur-[12px]`.
- Desktop (`≥ md`): current centered dialog (`rounded-2xl`, `max-w-sm`, `shadow-xl`).
- Keep existing behavior: Escape close, focus trap, `role="dialog"`, `aria-modal`, `onClose` on backdrop click.
- Implement via responsive Tailwind classes on one panel element (no `window.matchMedia` needed).

### 3. Sweep input classes → `.field`

Replace the 7 identical `inputCls` definitions and inline occurrences in:
- `src/components/application-form.tsx`
- `src/components/bulk-import.tsx` (selects/inputs)
- `src/app/(app)/sumber/sources-client.tsx`
- `src/app/(app)/sumber/edit-dialog.tsx`
- `src/app/(app)/akun/profile-form.tsx`
- `src/app/(app)/lamaran/import/page.tsx` (if it renders inputs — verify during impl)
- `src/app/sign-in/page.tsx`, `src/app/sign-in/code/page.tsx`

Keep any width/layout overrides (e.g. `flex-1`) as extra classes alongside `.field`.

### 4. Sweep buttons → `.btn-*`

- **Primary** (solid trailblaze, white bold): submit buttons, "Tambah" links, "Simpan", import action → `.btn-primary`.
- **Secondary** (bordered): pagination buttons, "Kembali", "Edit", filter selects keep their own style — select elements are NOT buttons; only actual `<button>`/action-links convert. → `.btn-secondary`.
- **Ghost**: close/X buttons, icon-only actions, "Batal" → `.btn-ghost` (ConfirmDialog cancel, modal X, RowActions icon).
- Destructive confirm button in `ConfirmDialog` keeps its distinct `bg-ember` danger styling (spec: Ember = critical/delete actions) — use `.btn-primary`-like shape with ember bg, defined inline as today.

### 5. Elevation on cards

Apply `shadow-card` to primary card containers: dashboard stat cards, `LamaranList` table/cards, detail page sections, Sumber list, charts, streak card, bulk-import table. Dropdown menu (RowActions) and toast already use `shadow-lg`/`shadow-xl` — keep those (higher elevation layers).

## Out of scope

- No new dependencies.
- No font or color value changes (already compliant).
- No changes to status badges, spacing, or layout grid.
- Streak Trail component stays as-is (already follows spec).

## Verification

- `npm run lint` + `npm run build` pass.
- Manual: modal shows as bottom sheet on mobile viewport, centered on desktop; inputs show 2px Trailblaze ring on focus; buttons render per variant; cards have subtle shadow; confirm dialog danger button unchanged.

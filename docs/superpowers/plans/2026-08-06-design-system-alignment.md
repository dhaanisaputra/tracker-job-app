# Align UI to DESIGN.md Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the app's UI styling with the DESIGN.md (Momentum Tracker) design system: responsive bottom-sheet modals, 2px Trailblaze input focus ring, spec button variants, and card elevation shadows.

**Architecture:** CSS utility classes defined once in `globals.css` (`@layer components`) and swept across all call sites. `Modal` becomes responsive via Tailwind classes (bottom sheet < md, centered ≥ md). No new dependencies; no changes to brand colors, fonts, or badges.

**Tech Stack:** Next.js 16.3, React 19, Tailwind v4, lucide-react.

## Global Constraints

- **No commits** — user said "jgn dulu di commit". Verification is `npm run lint` + `npm run build` + manual.
- **No new npm dependencies.**
- No changes to brand color values, fonts, status badges, spacing, or the Streak Trail component (already DESIGN.md-compliant).
- Do not break existing routes: `/sign-in`, `/dashboard`, `/lamaran`, `/statistik`, `/sumber`, `/lamaran/baru`, `/lamaran/import`, `/lamaran/[id]`, `/lamaran/[id]/edit`.
- ConfirmDialog's destructive confirm button keeps its distinct `bg-ember` danger styling (spec: Ember = delete/critical). Only its "Batal" button becomes `.btn-ghost`.
- Select elements are NOT converted to `.btn-*` (only actual `<button>` and action links).

---

### Task 1: Design tokens + component utilities in `globals.css`

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: nothing
- Produces: CSS var `--shadow-card`; component classes `.field`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.card` usable in later tasks.

- [ ] **Step 1: Add `--shadow-card` to `:root` and `.dark`**

Replace the `:root` block and `.dark` block to include the shadow token:

```css
:root {
  --nav-w: 13rem;
  --surface: #ffffff;
  --surface-muted: #f3f1ec;
  --paper: #f7f6f3;
  --ink: #201e1b;
  --stone: #8b887f;
  --line: #e3e0d6;
  --shadow-card: 0 4px 20px rgba(32, 30, 27, 0.04);
}

.dark {
  --surface: #1f1d19;
  --surface-muted: #26231f;
  --paper: #16150f;
  --ink: #f2efe9;
  --stone: #a39f93;
  --line: #3a362e;
  --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.35);
}
```

- [ ] **Step 2: Register the shadow as a Tailwind color/shadow utility**

Inside the existing `@theme inline { ... }` block, add:

```css
  --shadow-card: var(--shadow-card);
```

If the build complains about shadow token registration (Tailwind v4 shadows are `--shadow-*`), the `shadow-card` utility is auto-generated from `--shadow-card`; keep it inside `@theme inline`.

- [ ] **Step 3: Add component utilities**

Append at the end of the file:

```css
@layer components {
  .field {
    @apply w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-transparent focus:ring-2 focus:ring-trailblaze;
  }
  .btn-primary {
    @apply inline-flex items-center justify-center gap-1 rounded-lg bg-trailblaze px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60;
  }
  .btn-secondary {
    @apply inline-flex items-center justify-center gap-1 rounded-lg border border-stone/40 px-3 py-2 text-sm font-medium text-ink transition hover:bg-stone/10 disabled:opacity-40;
  }
  .btn-ghost {
    @apply inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-stone transition hover:bg-stone/10;
  }
  .card {
    @apply rounded-xl border border-line bg-surface p-4 shadow-card;
  }
}
```

- [ ] **Step 4: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds (14 routes). `shadow-card` must resolve — if it errors, keep `--shadow-card` in `:root` AND reference the shadow via inline `style` fallback: change `.card` to `shadow-[var(--shadow-card)]`.

---

### Task 2: Responsive bottom-sheet `Modal`

**Files:**
- Modify: `src/components/modal.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: unchanged `Modal({ open, onClose, title, children })` signature — all consumers (ConfirmDialog, EditSourceDialog, error modals) work unchanged. Behavior preserved: Escape close, focus trap, `role="dialog"`, `aria-modal`, backdrop click close.

- [ ] **Step 1: Rewrite the panel JSX**

Replace the return JSX (from `return (` through `</div>\n  )`) with:

```tsx
return (
  <div className="fixed inset-0 z-30 flex items-end justify-center p-4 md:items-center">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-[12px]" onClick={onClose} />
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="relative w-full rounded-t-2xl border border-line bg-surface p-5 shadow-xl outline-none md:max-w-sm md:rounded-2xl"
    >
      <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-stone/30 md:hidden" />
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-stone hover:bg-stone/10">
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[70dvh] overflow-y-auto">
        {children}
      </div>
    </div>
  </div>
)
```

- [ ] **Step 2: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds. Manual: open ConfirmDialog on a mobile-width viewport → panel slides from bottom with drag handle; on ≥768px → centered dialog.

---

### Task 3: Sweep inputs → `.field`

**Files:**
- Modify: `src/components/application-form.tsx`
- Modify: `src/components/bulk-import.tsx`
- Modify: `src/app/(app)/sumber/sources-client.tsx`
- Modify: `src/app/(app)/sumber/edit-dialog.tsx`
- Modify: `src/app/(app)/akun/profile-form.tsx`
- Modify: `src/app/sign-in/page.tsx`
- Modify: `src/app/sign-in/code/page.tsx`

**Interfaces:**
- Consumes: `.field` class from Task 1.
- Produces: all inputs/textarea/selects use `.field` + any extra layout classes.

- [ ] **Step 1: `application-form.tsx`**

Replace the `inputCls` constant (line 23-24) with:

```tsx
const inputCls = 'field'
```

The `AutosizeTextarea` uses `className={inputCls}` — fine. Replace the remaining inline input classes:
- Search input is NOT in this file (it is in `lamaran-list.tsx`, handled in Task 4).
- Verify no other literal `border-line bg-surface` input classes remain in this file; convert any to `.field` with the same extra classes appended.

- [ ] **Step 2: `bulk-import.tsx`**

In `doImport` there are no inputs. Convert the select/checkbox styling is NOT required. But the file has no `inputCls`; skip unless a `border-line bg-surface` input exists — it does not (only table). **No change needed in this file** for `.field`; its buttons are handled in Task 4.

- [ ] **Step 3: `sources-client.tsx`**

Replace `const inputCls = 'w-full ...'` (line 11) with:

```tsx
const inputCls = 'field'
```

- [ ] **Step 4: `edit-dialog.tsx`**

Replace the inline input `className` (line 21) with `className="field flex-1"` (keeps the flex sizing).

- [ ] **Step 5: `profile-form.tsx`**

Replace `const inputCls = 'w-full ...'` (line 9) with:

```tsx
const inputCls = 'field'
```

- [ ] **Step 6: `sign-in/page.tsx`**

Replace the email input `className` (line 29) with:

```tsx
className="field"
```

- [ ] **Step 7: `sign-in/code/page.tsx`**

Replace the OTP input `className` (line 35) with:

```tsx
className="field text-center font-mono text-2xl tracking-[0.5em]"
```

(Keep the mono/centered styling; `.field` provides the base.)

- [ ] **Step 8: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds. Manual: focus any input → 2px Trailblaze ring, border fades.

---

### Task 4: Sweep buttons → `.btn-*` + card elevation

**Files:**
- Modify: `src/components/lamaran-list.tsx`
- Modify: `src/components/bulk-import.tsx`
- Modify: `src/components/confirm-dialog.tsx`
- Modify: `src/components/application-form.tsx`
- Modify: `src/components/charts.tsx`
- Modify: `src/components/streak-trail.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/(app)/lamaran/page.tsx`
- Modify: `src/app/(app)/lamaran/[id]/page.tsx`
- Modify: `src/app/(app)/sumber/sources-client.tsx`
- Modify: `src/app/(app)/akun/profile-form.tsx`
- Modify: `src/app/(app)/sumber/edit-dialog.tsx`
- Modify: `src/app/(app)/lamaran/import/page.tsx` (verify contents first; convert any buttons)

**Interfaces:**
- Consumes: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.card` from Task 1.
- Produces: consistent button variants and elevated cards across the app.

- [ ] **Step 1: `lamaran-list.tsx`**

Convert:
- Search input (line ~144): `className="field py-2 pl-9 pr-3"` (keep icon padding, drop the duplicated base classes).
- Status/source filter selects (lines ~147, ~153): keep as-is (selects, not buttons) — no change.
- Bulk bar delete button (line ~158): keep `bg-ember` (destructive) — no change.
- Bulk status select: keep as-is.
- "Sebelumnya"/"Berikutnya" pagination buttons (lines ~250, ~258): `className="btn-secondary px-3 py-1.5"`.
- RowActions trigger button (MoreHorizontal): `className="btn-ghost p-2"`.
- RowActions menu item buttons/links: keep current look, optionally use `btn-ghost`-like padding — leave as-is to minimize churn.
- Cards: compact list wrapper `rounded-xl border border-line bg-surface` (line 33) → add `shadow-card`; empty state (line 177) → add `shadow-card`; mobile cards (line 189) → add `shadow-card`; table wrapper (line 208) → add `shadow-card`.

- [ ] **Step 2: `bulk-import.tsx`**

Convert:
- File-drop button (line ~116): keep dashed-border look, but add `shadow-card` to it.
- "Kembali" (line ~154): `className="btn-secondary"`.
- "Import N lamaran" (line ~156): `className="btn-primary flex-1"`.
- Table wrapper (line ~127): add `shadow-card`.

- [ ] **Step 3: `confirm-dialog.tsx`**

Convert:
- "Batal" button: `className="btn-ghost"`.
- Confirm (destructive) button: keep `bg-ember` — change to `className="rounded-lg bg-ember px-4 py-2 text-sm font-semibold text-white hover:opacity-90"` (no change from current).

- [ ] **Step 4: `application-form.tsx`**

Convert:
- Submit button (line ~261): `className="btn-primary w-full"`.
- Error modal "Tutup" button: `className="btn-primary"`.

- [ ] **Step 5: `charts.tsx`, `streak-trail.tsx`**

Add `shadow-card` to each `rounded-xl border border-line bg-surface p-4` section (3 in charts, 1 in streak-trail).

- [ ] **Step 6: `dashboard/page.tsx`**

Add `shadow-card` to the two stat card divs (lines 48, 52). Convert the "Impor" Link (line 36) to `className="btn-secondary"` if it is an action link.

- [ ] **Step 7: `lamaran/page.tsx`**

Convert the "Impor" Link (line 14) to `className="btn-secondary"` and "Tambah" Link (line 17) to `className="btn-primary"`.

- [ ] **Step 8: `lamaran/[id]/page.tsx`**

Add `shadow-card` to sections (lines 86, 108, 114, 122). Convert "Edit" Link (line 56) to `className="btn-secondary"`.

- [ ] **Step 9: `sources-client.tsx`**

Add `shadow-card` to add-source box (line 26) and list (line 39). Convert "Tambah" submit (line 28) to `className="btn-primary"`.

- [ ] **Step 10: `sumber/edit-dialog.tsx`**

Convert "Simpan" (line 23) to `className="btn-primary"`.

- [ ] **Step 11: `akun/profile-form.tsx`**

Add `shadow-card` to profile header (line 31) and form (line 43). Convert "Simpan profil" (SubmitButton, line 18) to `className="btn-primary w-full"`. Convert mobile logout (line 74) to keep `bg-ember` but match shape: `className="w-full rounded-lg bg-ember px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"` (no change).

- [ ] **Step 12: Verify `lamaran/import/page.tsx`**

Read the file. It contains only a back `<Link>` (navigation, not an action button) and the `<BulkImport>` component — **no changes needed**. Skip to Step 13.

- [ ] **Step 13: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds. Manual: check pagination buttons, import/tambah buttons, simpan buttons render per variant; cards have subtle shadow; confirm dialog Batal is ghost, Hapus stays ember.

---

### Task 5: Final verification pass

**Files:**
- None (verification only)

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: succeeds, 14 routes, no type errors.

- [ ] **Step 3: Manual checklist**

- [ ] Mobile viewport: ConfirmDialog / EditSourceDialog / error modals render as bottom sheets with drag handle; desktop centered.
- [ ] Inputs show 2px Trailblaze focus ring (forms, search, OTP, profile).
- [ ] Primary buttons solid Trailblaze/white; secondary bordered; Batal is ghost.
- [ ] ConfirmDialog "Hapus"/"Keluar" still ember danger.
- [ ] Cards/dropdowns have subtle elevation shadow; borders still present.
- [ ] All existing routes render without errors, no visual regressions on dashboard/statistik/akun.

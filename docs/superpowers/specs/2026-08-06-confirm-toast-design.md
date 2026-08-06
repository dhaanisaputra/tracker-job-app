# Confirm Dialogs, Error Modal & Success Toast

Date: 2026-08-06

## Problem

1. Destructive actions use native `window.confirm` (ugly, non-stylized) or none at all:
   - Detail lamaran delete (`confirm-delete.tsx`)
   - Lamaran list RowActions delete + bulk delete (`lamaran-list.tsx`)
   - Sumber delete (`sources-client.tsx`)
   - Logout (`nav.tsx`) — no confirmation
2. No success/failure feedback after actions (save lamaran, import, delete, update status).
3. The three-dots dropdown menu in the lamaran table gets clipped by the container's `overflow-hidden`, so options on bottom rows are cut off.

## Decisions

- Confirmation: reusable `ConfirmDialog` component (wraps existing `Modal`).
- Failure feedback: modal dialog showing the error message (reuse `Modal`).
- Success feedback: lightweight auto-dismissing toast (no new library).
- Three-dots fix: dropdown positioned with `fixed` coordinates from the trigger button rect, rendered outside the table's overflow clipping.

## Changes

### 1. New component `src/components/confirm-dialog.tsx`

Wraps `Modal`. Props:

```ts
{
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string   // default "Hapus" / passed in
  confirmClass?: string   // default ember (danger) styling
  onConfirm: () => void
  onCancel: () => void
}
```

Buttons: **Batal** (secondary) and **Hapus/Keluar** (danger `bg-ember text-white`). Renders inside `Modal`.

### 2. New component `src/components/toast.tsx`

Lightweight toast, no library. API:

```ts
export function useToast(): (msg: string) => void
// renders a fixed top-center pill that auto-hides after ~2.5s
```

Implementation: a `Toaster` component mounted once in `(app)/layout.tsx` plus a small event-based bus (module-level callback) so any client component can `toast('Lamaran tersimpan')`. Keeps it dependency-free and avoids prop drilling.

### 3. Wire destructive actions through ConfirmDialog

| Location | Action |
| --- | --- |
| `confirm-delete.tsx` (detail page) | Clicking "Hapus" opens dialog; confirm runs the delete server action |
| `lamaran-list.tsx` RowActions | "Hapus" opens dialog; confirm deletes row |
| `lamaran-list.tsx` bulk delete | "Hapus" (bulk bar) opens dialog with count; confirm deletes selection |
| `sources-client.tsx` | Trash button opens dialog; confirm runs `deleteSource` |
| `nav.tsx` | "Keluar" opens dialog; confirm runs `signOut` |

### 4. Error modal + success toast on mutations

- Save lamaran (create/edit): success → toast "Lamaran tersimpan"; error → modal with `result.message`.
- Import: success → toast "N lamaran diimpor"; error → modal.
- Delete single / bulk: success → toast "Lamaran dihapus" / "N lamaran dihapus".
- Delete sumber: success → toast "Sumber dihapus"; error already handled by redirect banner, keep as-is.
- Bulk status change: success → toast "Status diperbarui".

### 5. Fix three-dots clipping (`lamaran-list.tsx` RowActions)

Replace `absolute` dropdown inside the `relative` trigger with a `fixed` dropdown positioned from `getBoundingClientRect()` of the trigger button. Render the menu (and its backdrop) in a portal-style `fixed` layer so the table's `overflow-hidden` cannot clip it. Close on outside click / Escape. Keep current menu items (Lihat, Edit, Hapus).

## Out of scope

- No new dependencies.
- No changes to sign-in flow toasts.
- Sumber delete error keeps the existing `?err=` redirect banner.
- No global state library; toast bus is module-local.

## Verification

- Build + lint pass.
- Manual: open three-dots on the last table row → menu fully visible, not clipped.
- Manual: delete/save/logout show confirm dialog; confirm shows success toast; error path shows error modal.

# Confirm Dialogs, Error Modal & Success Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native `window.confirm` with styled confirm dialogs, add an error modal + success toast feedback loop, and fix the three-dots dropdown being clipped by the table's `overflow-hidden`.

**Architecture:** A reusable `ConfirmDialog` wraps the existing `Modal` component for all destructive confirmations. A dependency-free toast bus (`toast(msg)` + `<Toaster/>` mounted in `(app)/layout.tsx`) shows auto-hiding success messages. The RowActions dropdown switches from `absolute`-inside-`overflow-hidden` to `fixed` coordinates derived from the trigger button's `getBoundingClientRect()`, so nothing clips it. Server actions are invoked imperatively via `startTransition` so the client can show feedback around them.

**Tech Stack:** Next.js 16.3 (App Router), React 19, TypeScript, Tailwind v4, lucide-react, `@insforge/sdk`.

## Global Constraints

- **No commits** — user said "jgn dulu di commit". All verification is `npm run lint` + `npm run build` + manual.
- **No new npm dependencies** — toast is a hand-rolled event bus, confirm dialog reuses `Modal`.
- UI copy in Indonesian (existing pattern).
- Do not break existing routes: `/sign-in`, `/dashboard`, `/lamaran`, `/statistik`, `/sumber`, `/lamaran/baru`, `/lamaran/import`, `/lamaran/[id]`, `/lamaran/[id]/edit`.
- Existing `Modal` (z-30) and server actions (`deleteApplication`, `deleteSource`, `signOut`, `updateSource`) unchanged in signature.
- RLS client helpers unchanged: server via `serverDb()`, browser via `createBrowserClient()`.

---

### Task 1: `ConfirmDialog` component

**Files:**
- Create: `src/components/confirm-dialog.tsx`

**Interfaces:**
- Consumes: `Modal` from `@/components/modal`
- Produces: `ConfirmDialog({ open, title, message, confirmLabel?, onConfirm, onCancel })` — `confirmLabel` defaults to `'Hapus'`, buttons **Batal** (secondary) + **confirmLabel** (danger `bg-ember text-white`).

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { Modal } from '@/components/modal'

type Props = {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Hapus', onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-stone">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-stone/10"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-ember px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: no errors.

---

### Task 2: Toast bus + `<Toaster/>`

**Files:**
- Create: `src/components/toast.tsx`
- Modify: `src/app/(app)/layout.tsx` — mount `<Toaster/>`

**Interfaces:**
- Consumes: nothing
- Produces: `toast(msg: string)` (module-level callable from any client component) and `<Toaster />` (renders a fixed top-center pill, auto-hides after 2500ms). Both exported from `@/components/toast`.

- [ ] **Step 1: Create the toast module**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

let listeners: ((msg: string) => void)[] = []

export function toast(msg: string) {
  listeners.forEach((l) => l(msg))
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const onToast = (m: string) => setMsg(m)
    listeners.push(onToast)
    return () => {
      listeners = listeners.filter((l) => l !== onToast)
    }
  }, [])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2500)
    return () => clearTimeout(t)
  }, [msg])

  if (!msg) return null
  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper shadow-lg">
      <span className="inline-flex items-center gap-2">
        <CheckCircle2 size={16} /> {msg}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Mount `<Toaster/>` in the app layout**

In `src/app/(app)/layout.tsx`, add the import and render it inside the root div:

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/server-user'
import { Nav } from '@/components/nav'
import { Toaster } from '@/components/toast'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  return (
    <div className="mx-auto w-full max-w-5xl pb-20 md:pb-0">
      <div className="md:pl-[var(--nav-w)]">{children}</div>
      <Nav />
      <Toaster />
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds with the 14 existing routes.

---

### Task 3: Detail page delete → ConfirmDialog

**Files:**
- Rewrite: `src/components/confirm-delete.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` from `@/components/confirm-dialog`; `action: (fd: FormData) => Promise<void>` (the `deleteApplication` server action, unchanged).
- Produces: `ConfirmDelete({ action, id })` — same props as before, so `src/app/(app)/lamaran/[id]/page.tsx` needs no change.

- [ ] **Step 1: Rewrite `confirm-delete.tsx`**

```tsx
'use client'

import { startTransition, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

export function ConfirmDelete({ action, id }: { action: (fd: FormData) => Promise<void>; id: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg border border-ember/40 px-3 py-1.5 text-sm font-medium text-ember hover:bg-ember/10"
      >
        <Trash2 size={14} /> Hapus
      </button>
      <ConfirmDialog
        open={open}
        title="Hapus lamaran?"
        message="Lamaran ini akan dihapus permanen. Tindakan tidak bisa dibatalkan."
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false)
          const fd = new FormData()
          fd.append('id', id)
          startTransition(() => action(fd))
        }}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds. Manual: detail page → Hapus → dialog appears; confirm deletes and returns to `/lamaran`.

---

### Task 4: Three-dots dropdown fix + delete/status/bulk confirm + toasts in `lamaran-list.tsx`

**Files:**
- Modify: `src/components/lamaran-list.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` from `@/components/confirm-dialog`; `toast` from `@/components/toast`; `deleteApplication` from `@/app/(app)/lamaran/[id]/actions`; `insforge` from `@/lib/browser-client` (all unchanged).
- Produces: unchanged exports (`LamaranList`, `StatusBadge`). `RowActions` becomes position-aware via `getBoundingClientRect`.

- [ ] **Step 1: Update imports**

Replace the import block at the top of the file:

```tsx
import { useEffect, useRef, useState } from 'react'
import { startTransition } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, CheckSquare, Square, Trash2, MoreHorizontal, Pencil, Eye } from 'lucide-react'
import { insforge } from '@/lib/browser-client'
import { STATUSES, STATUS_COLORS } from '@/lib/types'
import type { ApplicationWithSource, Source } from '@/lib/types'
import { deleteApplication } from '@/app/(app)/lamaran/[id]/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from '@/components/toast'
```

- [ ] **Step 2: Add bulk-delete confirm state in `FullList`**

Add state next to the existing `openMenu` state (around line 74):

```tsx
const [confirmBulk, setConfirmBulk] = useState(false)
```

- [ ] **Step 3: Replace `bulkDelete` and `bulkStatus`**

Replace the existing `bulkDelete` and `bulkStatus` functions with these (the actual deletion runs on dialog confirm):

```tsx
async function runBulkDelete() {
  if (selected.size === 0) return
  await insforge.database.from('job_applications').delete().in('id', [...selected])
  const n = selected.size
  setSelected(new Set())
  setPage(0)
  toast(`${n} lamaran dihapus`)
  refetch()
}

async function bulkStatus(s: string) {
  if (selected.size === 0) return
  await insforge.database.from('job_applications').update({ current_status: s }).in('id', [...selected])
  setSelected(new Set())
  toast('Status diperbarui')
  refetch()
}
```

- [ ] **Step 4: Wire the bulk delete button to the dialog**

Replace the bulk bar delete button (around line 158):

```tsx
<button onClick={() => setConfirmBulk(true)} className="inline-flex items-center gap-1 rounded-md bg-ember px-2 py-1 text-white"><Trash2 size={14} /> Hapus</button>
```

And render the dialog just before the closing `</div>` of the component (after the pagination block):

```tsx
<ConfirmDialog
  open={confirmBulk}
  title="Hapus lamaran?"
  message={`Hapus ${selected.size} lamaran terpilih? Tindakan tidak bisa dibatalkan.`}
  confirmLabel="Hapus"
  onCancel={() => setConfirmBulk(false)}
  onConfirm={() => {
    setConfirmBulk(false)
    runBulkDelete()
  }}
/>
```

- [ ] **Step 5: Rewrite `RowActions` with fixed positioning + delete dialog**

Replace the entire `RowActions` function at the bottom of the file:

```tsx
function RowActions({ appId, open, onToggle }: { appId: string; open: boolean; onToggle: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.right - 160 })
    }
    if (!open) setPos(null)
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={onToggle} aria-label="Tindakan" className="rounded-lg p-2 text-stone hover:bg-stone/10">
        <MoreHorizontal size={18} />
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div
            className="fixed z-20 w-40 rounded-xl border border-line bg-surface p-1 shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            <Link href={`/lamaran/${appId}`} onClick={onToggle} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-stone/10">
              <Eye size={14} /> Lihat
            </Link>
            <Link href={`/lamaran/${appId}/edit`} onClick={onToggle} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-stone/10">
              <Pencil size={14} /> Edit
            </Link>
            <button
              onClick={() => {
                onToggle()
                setConfirmOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ember hover:bg-ember/10"
            >
              <Trash2 size={14} /> Hapus
            </button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus lamaran?"
        message="Lamaran ini akan dihapus permanen. Tindakan tidak bisa dibatalkan."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          const fd = new FormData()
          fd.append('id', appId)
          startTransition(() => deleteApplication(fd))
        }}
      />
    </>
  )
}
```

- [ ] **Step 6: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds. Manual: open three-dots on the **last** table row → menu fully visible, not clipped; Hapus shows dialog; bulk select + Hapus shows dialog with count; after bulk delete/status a success toast appears.

---

### Task 5: Sumber delete → ConfirmDialog + toast

**Files:**
- Modify: `src/app/(app)/sumber/sources-client.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` from `@/components/confirm-dialog`; `toast` from `@/components/toast`; `deleteSource` server action (unchanged).
- Produces: unchanged `SourcesClient` export.

- [ ] **Step 1: Update imports and add delete state**

Replace the top of the file:

```tsx
'use client'

import { startTransition, useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { Source } from '@/lib/types'
import { createSource, deleteSource } from './actions'
import { EditSourceDialog } from './edit-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from '@/components/toast'
```

In `SourcesClient`, add `const [deleting, setDeleting] = useState<Source | null>(null)` next to the existing `editing` state.

- [ ] **Step 2: Replace the delete form with a button + dialog**

Replace the delete `<form>` block (lines 44-49) with:

```tsx
<button
  onClick={() => setDeleting(s)}
  className="rounded-lg p-2 text-ember hover:bg-ember/10"
  title="Hapus (tidak bisa hapus sumber yang masih dipakai)"
>
  <Trash2 size={16} />
</button>
```

And render the dialog next to `EditSourceDialog`:

```tsx
<ConfirmDialog
  open={deleting !== null}
  title="Hapus sumber?"
  message={deleting ? `Sumber "${deleting.name}" akan dihapus.` : ''}
  onCancel={() => setDeleting(null)}
  onConfirm={() => {
    const s = deleting
    setDeleting(null)
    if (!s) return
    const fd = new FormData()
    fd.append('id', s.id)
    startTransition(() => deleteSource(fd))
    toast('Sumber dihapus')
  }}
/>
<EditSourceDialog source={editing} open={editing !== null} onClose={() => setEditing(null)} />
```

- [ ] **Step 3: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds. Manual: trash icon → dialog; confirm → toast "Sumber dihapus". Error path (sumber masih dipakai) still shows the `?err=` banner.

---

### Task 6: Logout → ConfirmDialog

**Files:**
- Modify: `src/components/nav.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` from `@/components/confirm-dialog`; `signOut` server action (unchanged).
- Produces: unchanged `Nav` export.

- [ ] **Step 1: Add state and dialog**

Update imports:

```tsx
import { useEffect, useState } from 'react'
import { startTransition } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
```

In `Nav`, add `const [confirmLogout, setConfirmLogout] = useState(false)`.

Replace the logout `<form>` block (lines 111-122) with:

```tsx
<button
  type="button"
  onClick={() => setConfirmLogout(true)}
  title={collapsed ? 'Keluar' : undefined}
  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ember hover:bg-ember/10 ${
    collapsed ? 'justify-center px-0' : ''
  }`}
>
  <LogOut size={18} className="shrink-0" />
  {!collapsed && 'Keluar'}
</button>
```

And render the dialog just inside the closing `</aside>`:

```tsx
<ConfirmDialog
  open={confirmLogout}
  title="Keluar?"
  message="Kamu akan keluar dari akun ini."
  confirmLabel="Keluar"
  onCancel={() => setConfirmLogout(false)}
  onConfirm={() => {
    setConfirmLogout(false)
    startTransition(() => signOut())
  }}
/>
```

- [ ] **Step 2: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds. Manual: sidebar Keluar → dialog; confirm → redirects to `/sign-in`.

---

### Task 7: Application form — error modal + success toast

**Files:**
- Modify: `src/components/application-form.tsx`

**Interfaces:**
- Consumes: `Modal` from `@/components/modal`; `toast` from `@/components/toast`.
- Produces: unchanged `ApplicationForm` export.

- [ ] **Step 1: Update imports**

Replace the import block at the top:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { insforge } from '@/lib/browser-client'
import { STATUSES, EMPLOYMENT_TYPES, WORK_ARRANGEMENTS } from '@/lib/types'
import type { JobApplication, Source } from '@/lib/types'
import { Modal } from '@/components/modal'
import { toast } from '@/components/toast'
```

- [ ] **Step 2: Change submit handler to toast on success**

In `onSubmit`, replace the final block (lines 107-114):

```tsx
setSubmitting(false)
if (result) {
  setError(result.message)
  return
}
toast(isEdit ? 'Perubahan tersimpan' : 'Lamaran tersimpan')
router.push('/dashboard')
router.refresh()
```

- [ ] **Step 3: Render the inline error as a modal instead**

Replace the inline error `<p>` (line 144) with a `Modal` rendered just before the closing `</form>`:

```tsx
<Modal open={!!error} onClose={() => setError('')} title="Gagal menyimpan">
  <p className="text-sm text-ember">{error}</p>
  <div className="mt-5 flex justify-end">
    <button
      type="button"
      onClick={() => setError('')}
      className="rounded-lg bg-trailblaze px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
    >
      Tutup
    </button>
  </div>
</Modal>
```

- [ ] **Step 4: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds. Manual: save lamaran → toast "Lamaran tersimpan" then redirect; force an error (e.g. duplicate source name not applicable here — temporarily send bad data) → error modal appears.

---

### Task 8: Bulk import — error modal + success toast

**Files:**
- Modify: `src/components/bulk-import.tsx`

**Interfaces:**
- Consumes: `Modal` from `@/components/modal`; `toast` from `@/components/toast`.
- Produces: unchanged `BulkImport` export.

- [ ] **Step 1: Update imports and submit handler**

Update the import block:

```tsx
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { FileUp, Loader2 } from 'lucide-react'
import { insforge } from '@/lib/browser-client'
import { STATUSES } from '@/lib/types'
import type { Source } from '@/lib/types'
import { Modal } from '@/components/modal'
import { toast } from '@/components/toast'
```

Replace the tail of `doImport` (lines 99-105):

```tsx
setImporting(false)
if (err) {
  setError(err.message)
  return
}
toast(`${valid.length} lamaran diimpor`)
router.push('/dashboard')
router.refresh()
```

- [ ] **Step 2: Render the inline error as a modal**

Replace the inline error `<p>` (line 150) with a `Modal` just before the closing `</div>` of the component:

```tsx
<Modal open={!!error} onClose={() => setError('')} title="Gagal import">
  <p className="text-sm text-ember">{error}</p>
  <div className="mt-5 flex justify-end">
    <button
      type="button"
      onClick={() => setError('')}
      className="rounded-lg bg-trailblaze px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
    >
      Tutup
    </button>
  </div>
</Modal>
```

- [ ] **Step 3: Verify**

Run: `npm run lint` then `npm run build`
Expected: lint clean; build succeeds. Manual: import a valid file → toast "N lamaran diimpor" then redirect; import with an error → error modal.

---

### Task 9: Final verification pass

**Files:**
- None (verification only)

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: succeeds, 14 routes, no type errors.

- [ ] **Step 3: Manual checklist**

- [ ] `/lamaran` last-row three-dots menu fully visible (not clipped), Lihat/Edit/Hapus work.
- [ ] Row Hapus → ConfirmDialog; confirm deletes, success toast appears.
- [ ] Bulk select → Hapus → dialog with count; confirm deletes + toast.
- [ ] Bulk status change → toast "Status diperbarui".
- [ ] `/lamaran/[id]` Hapus → dialog → delete → back to list.
- [ ] `/sumber` trash → dialog → confirm → toast "Sumber dihapus"; error path shows banner.
- [ ] Sidebar Keluar → dialog → confirm → `/sign-in`.
- [ ] Save/edit lamaran → toast "Lamaran tersimpan"/"Perubahan tersimpan" → redirect.
- [ ] Import → toast "N lamaran diimpor" → redirect; error shows modal.
- [ ] All existing routes render without errors.

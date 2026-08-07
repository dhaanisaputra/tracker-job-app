# Task Deadline untuk Technical Interview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memungkinkan pengguna memasang deadline task saat lamaran ber-status `Technical Interview`, dengan peringatan visual (kuning/merah) saat deadline mendekat atau lewat, di list, detail, dan hitungan "Perlu Tindakan" dashboard.

**Architecture:** Kolom `task_deadline` di tabel `job_applications` + helper pure-function `taskState()` di aplikasi (Opsi A). Badge visual dipakai ulang di list compact/full dan detail. Dashboard menghitung pending task via query tambahan. Tanpa view/RPC baru.

**Tech Stack:** Next.js 16 (App Router), @insforge/sdk, Tailwind v4, React 19. SQL migration via `npx -y @insforge/cli db migrations`.

## Global Constraints

- Bahasa UI: Indonesia (label "Deadline task", chip "Task X hari lagi", dst).
- Hanya `Technical Interview` yang membawa task; HR Interview di luar scope (YAGNI).
- Ambang: `warning` = `<= 3 hari` (belum lewat); `overdue` = sudah lewat / tenggat hari ini dan belum submit.
- "Submit" = user mengubah `current_status` keluar dari `Technical Interview`. Tidak ada kolom submit terpisah.
- RLS tidak berubah: kolom baru otomatis tercakup policy existing `job_applications` (`auth.uid()`). Jangan ubah apa pun terkait user_id/RLS.
- Token warna: `amber` untuk warning, `ember` untuk overdue. Chip memakai pola `bg-amber/15 text-amber` dan `bg-ember/15 text-ember`.
- Tidak menambah dependency baru.

---

### Task 1: Migration SQL + tipe `task_deadline`

**Files:**
- Create: `migrations/<timestamp>_add-task-deadline.sql` (nama di-generate CLI)
- Modify: `src/lib/types.ts` (`JobApplication`)

**Interfaces:**
- Produces: kolom `task_deadline timestamptz` di `job_applications`; field `task_deadline?: string | null` di `JobApplication`.

- [ ] **Step 1: Buat file migration**

Run:
```
npx -y @insforge/cli db migrations new add-task-deadline
```
Expected: file baru `migrations/<timestamp>_add-task-deadline.sql` terbuat (nama berformat `YYYYMMDDHHMMSS_add-task-deadline.sql`). Isi file:

```sql
alter table public.job_applications
  add column if not exists task_deadline timestamptz;
```

- [ ] **Step 2: Apply migration**

Run:
```
npx -y @insforge/cli db migrations up --all
```
Expected: exit 0, kolom `task_deadline` terpasang di remote DB.

- [ ] **Step 3: Tambah tipe di `src/lib/types.ts`**

Pada `JobApplication` (setelah `interview_scheduled_at`, sebelum `offer_salary`):

```ts
  task_deadline?: string | null
```

- [ ] **Step 4: Verifikasi**

Run: `npm run build`
Expected: build pass tanpa type error terkait `task_deadline`.

- [ ] **Step 5: Commit**

```bash
git add migrations/<timestamp>_add-task-deadline.sql src/lib/types.ts
git commit -m "feat: add task_deadline column and type"
```

---

### Task 2: Helper `taskState` + self-check

**Files:**
- Create: `src/lib/task-state.ts`
- Test: self-check `__main__` di file yang sama (tanpa framework)

**Interfaces:**
- Consumes: tidak ada (pure).
- Produces:
  ```ts
  export type TaskState = { kind: 'none' } | { kind: 'warning'; label: string } | { kind: 'overdue'; label: string }
  export function taskState(currentStatus: string, deadline: string | null | undefined, now?: Date): TaskState
  ```

- [ ] **Step 1: Tulis helper + self-check (TDD merah-bukan-issue, karena pure function)**

Create `src/lib/task-state.ts`:

```ts
export type TaskState =
  | { kind: 'none' }
  | { kind: 'warning'; label: string }
  | { kind: 'overdue'; label: string }

const TECHNICAL_INTERVIEW = 'Technical Interview'
const WARN_MS = 3 * 24 * 60 * 60 * 1000

export function taskState(
  currentStatus: string,
  deadline: string | null | undefined,
  now: Date = new Date(),
): TaskState {
  if (currentStatus !== TECHNICAL_INTERVIEW) return { kind: 'none' }
  if (!deadline) return { kind: 'none' }

  const msLeft = new Date(deadline).getTime() - now.getTime()

  if (msLeft <= 0) {
    const days = Math.abs(Math.ceil(msLeft / 86400000))
    return {
      kind: 'overdue',
      label: days <= 0 ? 'Tenggat hari ini' : `Task lewat ${days} hari`,
    }
  }
  if (msLeft <= WARN_MS) {
    const days = Math.ceil(msLeft / 86400000)
    return {
      kind: 'warning',
      label: days <= 1 ? 'Task hari ini' : `Task ${days} hari lagi`,
    }
  }
  return { kind: 'none' }
}

// ponytail: dev self-check, no framework. Run: npx tsx src/lib/task-state.ts
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`task-state self-check failed: ${msg}`)
}

function runSelfCheck() {
  const base = new Date('2026-08-10T12:00:00Z')

  assert(taskState('Technical Interview', null, base).kind === 'none', 'null deadline -> none')
  assert(taskState('HR Interview', '2026-08-11T00:00:00Z', base).kind === 'none', 'non-tech status -> none')
  assert(taskState('Technical Interview', '2026-08-13T00:00:00Z', base).kind === 'warning', '3 days -> warning')
  assert((taskState('Technical Interview', '2026-08-11T00:00:00Z', base) as { label: string }).label === 'Task hari ini', '1 day label')
  assert(taskState('Technical Interview', '2026-08-10T10:00:00Z', base).kind === 'overdue', 'past -> overdue')
  assert((taskState('Technical Interview', '2026-08-08T00:00:00Z', base) as { label: string }).label === 'Task lewat 2 hari', 'overdue label')
  assert(taskState('Technical Interview', '2026-08-20T00:00:00Z', base).kind === 'none', 'far future -> none')

  console.log('task-state self-check: OK')
}

runSelfCheck()
```

- [ ] **Step 2: Jalankan self-check untuk pastikan pass**

Run: `npx tsx src/lib/task-state.ts`
Expected: `task-state self-check: OK`, exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/task-state.ts
git commit -m "feat: add taskState deadline helper with self-check"
```

---

### Task 3: Input "Deadline task" di form

**Files:**
- Modify: `src/components/application-form.tsx`

**Interfaces:**
- Consumes: `initial.task_deadline` dari `JobApplication` (Task 1).
- Produces: payload form menyertakan `task_deadline`; di-null saat status bukan `Technical Interview`.

- [ ] **Step 1: Tambah konstanta + state check**

Pada baris `const showInterview = status === 'HR Interview' || status === 'Technical Interview'` (line 118), tambahkan setelahnya:

```ts
  const showTaskDeadline = status === 'Technical Interview'
```

- [ ] **Step 2: Tambah field payload di `onSubmit`**

Di `payload` (setelah `interview_scheduled_at`, sebelum `offer_salary`):

```ts
      task_deadline: showTaskDeadline ? (form.get('task_deadline') || null) : null,
```

- [ ] **Step 3: Render input di form**

Setelah blok `{showInterview && (...)}` (setelah line 245), sebelum `{showOffer && (...)}`:

```tsx
        {showTaskDeadline && (
          <label className="block">
            <span className={labelCls}>Deadline task</span>
            <input
              type="datetime-local"
              name="task_deadline"
              defaultValue={initial?.task_deadline ? initial.task_deadline.slice(0, 16) : ''}
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-stone">
              Misal deadline assignment/coding test.
            </span>
          </label>
        )}
```

- [ ] **Step 4: Verifikasi**

Run: `npm run build && npm run lint`
Expected: build + lint pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/application-form.tsx
git commit -m "feat: add task deadline input on technical interview"
```

---

### Task 4: `TaskBadge` + pemasangan di list & detail

**Files:**
- Create: `src/components/task-badge.tsx`
- Modify: `src/components/lamaran-list.tsx` (compact list line 52 area, mobile card line 197 area, desktop table line 235)
- Modify: `src/app/(app)/lamaran/[id]/page.tsx`

**Interfaces:**
- Consumes: `taskState` dari Task 2; `ApplicationWithSource`/`JobApplication` berisi `task_deadline`.
- Produces: komponen `TaskBadge({ currentStatus, deadline })` yang merender `null` saat `kind === 'none'`.

- [ ] **Step 1: Buat `src/components/task-badge.tsx`**

```tsx
import { AlarmClock } from 'lucide-react'
import { taskState } from '@/lib/task-state'

export function TaskBadge({ currentStatus, deadline }: { currentStatus: string; deadline?: string | null }) {
  const state = taskState(currentStatus, deadline)
  if (state.kind === 'none') return null

  const cls = state.kind === 'overdue' ? 'bg-ember/15 text-ember' : 'bg-amber/15 text-amber'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-xs font-semibold ${cls}`}>
      <AlarmClock size={12} />
      {state.label}
    </span>
  )
}
```

- [ ] **Step 2: Pasang di compact list (`lamaran-list.tsx`)**

Di blok compact (`variant === 'compact'`), pada elemen `initialItems.map` setelah `<StatusBadge status={app.current_status} />` (line 52):

```tsx
                    <TaskBadge currentStatus={app.current_status} deadline={app.task_deadline} />
```

Tambah import di `lamaran-list.tsx`:

```ts
import { TaskBadge } from '@/components/task-badge'
```

- [ ] **Step 3: Pasang di mobile card (full list)**

Pada `<div className="mt-1 flex flex-wrap items-center gap-2 text-label-xs text-stone">` (line 196), setelah `<StatusBadge status={app.current_status} />` (line 197):

```tsx
                    <TaskBadge currentStatus={app.current_status} deadline={app.task_deadline} />
```

- [ ] **Step 4: Pasang di desktop table**

Pada `<td className="p-3"><StatusBadge status={app.current_status} /></td>` (line 235), ubah menjadi:

```tsx
                    <td className="p-3">
                      <StatusBadge status={app.current_status} />
                      <div className="mt-1"><TaskBadge currentStatus={app.current_status} deadline={app.task_deadline} /></div>
                    </td>
```

- [ ] **Step 5: Pasang di detail page (`(app)/lamaran/[id]/page.tsx`)**

Pada header, setelah `<StatusBadge status={app.current_status} />` (line 60):

```tsx
          <TaskBadge currentStatus={app.current_status} deadline={app.task_deadline} />
```

Tambah import:

```ts
import { TaskBadge } from '@/components/task-badge'
```

- [ ] **Step 6: Verifikasi**

Run: `npm run build && npm run lint`
Expected: pass. Manual: set satu lamaran ke Technical Interview + deadline dekat → chip muncul di ketiga tempat; status non-tech → chip hilang.

- [ ] **Step 7: Commit**

```bash
git add src/components/task-badge.tsx src/components/lamaran-list.tsx "src/app/(app)/lamaran/[id]/page.tsx"
git commit -m "feat: show task deadline badge in list and detail"
```

---

### Task 5: Dashboard "Perlu Tindakan" termasuk pending task

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/lib/stats.ts` (tambah helper count? Tidak — hitung inline di dashboard)

**Interfaces:**
- Consumes: `taskState` (Task 2), `serverDb()`.
- Produces: `followup` count memasukkan `pendingTasks`.

- [ ] **Step 1: Tambah query task + import**

Di `src/app/(app)/dashboard/page.tsx`:

Tambah import:

```ts
import { taskState } from '@/lib/task-state'
```

Ganti blok `Promise.all` (line 16-23) dengan versi yang menyertakan query task, dan tambah `taskRes` pada nama destrukturisasi:

```ts
  const [datesRes, totalRes, todayRes, followRes, interviewRes, recentRes, taskRes] = await Promise.all([
    insforge.from('job_applications').select('applied_date').order('applied_date', { ascending: false }).limit(90),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).eq('applied_date', new Date().toISOString().slice(0, 10)),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).not('next_follow_up_date', 'is', null).lte('next_follow_up_date', cutoff()),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).not('interview_scheduled_at', 'is', null).lte('interview_scheduled_at', interviewCutoff()),
    insforge.from('job_applications').select('*, sources(name)').order('applied_date', { ascending: false }).limit(5),
    insforge.from('job_applications').select('current_status, task_deadline').eq('current_status', 'Technical Interview').not('task_deadline', 'is', null),
  ])
```

- [ ] **Step 2: Hitung `pendingTasks`**

Setelah `const followup = ...` (line 30), ganti menjadi:

```ts
  const pendingTasks = (taskRes.data ?? []).filter(
    (t: { current_status: string; task_deadline: string | null }) =>
      taskState(t.current_status, t.task_deadline).kind !== 'none',
  ).length
  const followup = (followRes.count ?? 0) + (interviewRes.count ?? 0) + pendingTasks
```

- [ ] **Step 3: Verifikasi**

Run: `npm run build && npm run lint`
Expected: pass. Manual: lamaran Technical Interview dengan deadline <= 3 hari / lewat → angka "Perlu Tindakan" bertambah; status lain tidak.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx"
git commit -m "feat: count pending task deadlines in needs-action stat"
```

---

### Task 6: Verifikasi akhir end-to-end

**Files:**
- none

**Interfaces:**
- none

- [ ] **Step 1: Self-check helper**

Run: `npx tsx src/lib/task-state.ts`
Expected: `task-state self-check: OK`.

- [ ] **Step 2: Build + lint penuh**

Run: `npm run build && npm run lint`
Expected: 0 error.

- [ ] **Step 3: Manual smoke test**

- Buat/edit lamaran, set status `Technical Interview`, isi deadline besok → chip kuning "Task hari ini/1 hari lagi" muncul di list + detail; "Perlu Tindakan" naik.
- Set status `Rejected` → chip hilang, angka turun.
- Pastikan data user lain tidak terpengaruh (kolom baru tercakup RLS `auth.uid()`).

- [ ] **Step 4: Commit (jika ada perubahan tambahan)**

```bash
git add -A
git commit -m "chore: verify task deadline feature end-to-end"
```

---

## Out of scope (dari spec)

- HR Interview task — kolom sudah fleksibel untuk ditambah nanti.
- Notifikasi push/email — peringatan visual saja.
- Tidak mengubah pipeline status / RLS.
- Tanpa dependency baru.

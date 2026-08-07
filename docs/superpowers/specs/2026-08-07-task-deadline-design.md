# Task Deadline untuk Technical Interview

Date: 2026-08-07

## Problem

Saat lamaran berada di tahap `Technical Interview` (biasanya berisi assignment/coding test), pengguna sering lupa batas waktu mengerjakan task-nya. Tidak ada mekanisme untuk menandai deadline dan mengingatkan ketika batas waktu mendekat atau sudah lewat namun belum dikerjakan (belum mengubah status).

## Goals

- Pengguna bisa memasang deadline task saat lamaran di tahap `Technical Interview`.
- Muncul peringatan visual (kuning/merah) ketika deadline mendekat / sudah lewat dan status masih di `Technical Interview` (belum "submit").
- Peringatan tampil di list lamaran, detail lamaran, dan ikut dihitung dalam angka "Perlu Tindakan" di dashboard.
- "Submit" didefinisikan sebagai aksi pengguna mengubah status keluar dari `Technical Interview` (tidak ada kolom submit terpisah — YAGNI).

## Decisions

- **Opsi A (dipilih):** kolom `task_deadline` di tabel yang sama + helper pure-function di aplikasi. Tidak ada view/RPC baru — satu sumber kebenaran, mudah diuji.
- Tahap yang membawa task: hanya `Technical Interview` (HR Interview opsional kemudian — YAGNI).
- Ambang warn: **kuning** jika `<= 3 hari` lagi (dan belum lewat); **merah/overdue** jika sudah lewat (atau hari yang sama belum submit).
- Pemisahan jam: deadline disimpan `timestamptz` (datetime-local di form).
- RLS tidak berubah: kolom baru mengikuti policy existing `job_applications` (`auth.uid()`), isolasi antar-user terjaga.

## Changes

### 1. Migration SQL

```sql
alter table job_applications
  add column if not exists task_deadline timestamptz;
```

### 2. Type `src/lib/types.ts`

Tambah field pada `JobApplication`:

```ts
task_deadline?: string | null
```

### 3. Helper baru `src/lib/task-state.ts`

Pure function, bebas-side-effect, mudah diuji:

```ts
export type TaskState =
  | { kind: 'none' }
  | { kind: 'warning'; label: string }
  | { kind: 'overdue'; label: string }

export function taskState(
  currentStatus: string,
  deadline: string | null | undefined,
  now: Date = new Date(),
): TaskState
```

Logika:
- `currentStatus !== 'Technical Interview'` → `none`
- `deadline` null/kosong → `none`
- hitung `msLeft = deadline - now`
- `msLeft <= 0` → `overdue` (`label` "Task lewat X hari" / "Tenggat hari ini")
- `msLeft <= 3*24h` → `warning` (label "Task X hari lagi"; hari yang sama → "Task hari ini")
- selainnya → `none`

### 4. Form `src/components/application-form.tsx`

- Tambah input `datetime-local` **"Deadline task"** yang only muncul ketika `current_status === 'Technical Interview'` (pola sama seperti `showInterview`).
- On save: jika status yang disimpan bukan `Technical Interview` → simpan `task_deadline` sebagai `null` (dipakai ulang nilai hanya saat status sesuai).

### 5. Badge tampilan `src/components/task-badge.tsx`

Komponen kecil yang merender chip saat state bukan `none`:
- warning: chip kuning (token amber/`bg-amber-...`, teks) — `⏰ <label>`
- overdue: chip merah (token ember) — `⏰ <label>`

Dipasang di:

- `LamaranList` (compact + penuh): di samping badge StatusBadge, hanya render saat `kind != none`.
- Detail lamaran `/lamaran/[id]` (bar info di atas, bila ada).

### 6. Dashboard "Perlu Tindakan" `src/app/(app)/dashboard/page.tsx`

Tambah query ke-3 yang mengambil field `current_status` + `task_deadline` untuk lamaran ber-status `Technical Interview`, lalu hitung `pendingTasks = count(taskState(...).kind !== 'none')`. Perbarui:

```ts
const followup = (followRes.count ?? 0) + (interviewRes.count ?? 0) + pendingTasks
```

(bucketing overlap minimal & accepted — lamaran yang masuk followup/interview umumnya status berbeda.)

### 7. Test mini (tanpa framework)

Di dalam `task-state.ts` (self-check `__main__`-style):

```ts
// ponytail: dev self-check, run via `node --experimental` jika perlu
const cases: [string, string, TaskState['kind']][] = [...]
```

Per Rule: tiap logika non-trivial menyisakan satu runnable check (assert-based), minimal.

## Out of scope

- HR Interview task (YAGNI, kolom sudah fleksibel untuk ditambah nanti).
- No new dependencies.
- Tidak mengubah sumber / pipeline status selain menambah kolom.
- Tidak ada notifikasi push/email — cukup peringatan visual.

## Verification

- Build + lint pass.
- Unit check dari `task-state.ts` (3 set kasus: warning/overdue/none) berjalan.
- Manual di UI: set status = Technical Interview → muncul field deadline; simpan → chip muncul; ubah status keluar → chip hilang; dashboard "Perlu Tindakan" bertambah.
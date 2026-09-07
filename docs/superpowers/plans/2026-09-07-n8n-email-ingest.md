# n8n Email Auto-Ingest Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email notifikasi job portal otomatis menjadi create/update `job_applications` via edge function `n8n-ingest` + notifikasi Telegram, dengan n8n jalan lokal via Docker.

**Architecture:** n8n (Docker, localhost:5678) polling Gmail → extract + map status → POST edge function (secret-guarded, admin client internal, `user_id` dikunci ke owner) → Telegram notif. Tidak ada perubahan schema/RLS/frontend.

**Tech Stack:** InsForge edge functions (Deno, `npm:@insforge/sdk`), n8n self-host (Docker), Gmail Trigger, Telegram node, Groq/Gemini free tier (fallback extractor).

## Global Constraints

- RLS `auth.uid() = user_id` tidak diubah; tidak ada migration.
- Admin/API key tidak pernah keluar InsForge; n8n hanya pegang `x-ingest-secret`.
- `current_status` harus persis salah satu dari 9 nilai: Applied, Screening, HR Interview, Technical Interview, Offer, Accepted, Rejected, Withdrawn, Ghosted (check constraint DB).
- Jangan insert `application_status_history` manual — trigger `trg_log_status_change` sudah otomatis (insert manual = duplikat).
- Jangan set `employment_type`/`work_arrangement` dari parse email (check constraint; ketidakpastian tinggi) — biarkan null, user lengkapi manual.
- `search_duplicates` RPC tidak bisa dipakai dari function (butuh `auth.uid()`); matcher = normalisasi JS + ILIKE.

---

## File Structure

- Create `functions/n8n-ingest.ts` — edge function: secret check, matcher, find-or-create source, upsert, summary branch, dry_run.
- Create `n8n/docker-compose.yml` — n8n lokal + volume persisten.
- Create `n8n/email-status-ingest.json` — export workflow 1 (dibangun di UI n8n, lalu export).
- Create `n8n/daily-summary.json` — export workflow 2 (dibangun di UI n8n, lalu export).
- Create `docs/n8n-runbook.md` — langkah non-coding user, detail (Docker, kredensial, uji).
- Secrets via CLI (tidak di file): `N8N_INGEST_SECRET`, `OWNER_USER_ID`.

---

### Task 1: Secrets + owner UUID

**Files:** (none — CLI only)

**Interfaces:**
- Produces: secrets `N8N_INGEST_SECRET`, `OWNER_USER_ID` di project InsForge; nilai secret pertama disalin ke kredensial n8n di Task 4.

- [ ] **Step 1: Ambil UUID owner**

Run: `npx -y @insforge/cli db query "SELECT id, email FROM auth.users LIMIT 5" --json`
Expected: satu baris = akun owner. Catat `id`-nya. (Single-user app: pastikan hanya 1 user; jika lebih, tanyakan user mana yang owner dan catat pilihannya di runbook.)

- [ ] **Step 2: Buat secret ingest (32-byte hex)**

Run (PowerShell): `$s = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) }); npx -y @insforge/cli secrets add N8N_INGEST_SECRET $s`
Expected: success. Salin nilai `$s` ke tempat aman sementara (dibutuhkan di Task 4 sebagai Header Auth n8n).

- [ ] **Step 3: Simpan owner UUID sebagai secret**

Run: `npx -y @insforge/cli secrets add OWNER_USER_ID <uuid-dari-step-1>`
Expected: success.

- [ ] **Step 4: Verifikasi**

Run: `npx -y @insforge/cli secrets list`
Expected: `N8N_INGEST_SECRET` dan `OWNER_USER_ID` terdaftar (tanpa nilai).

---

### Task 2: Edge function `n8n-ingest`

**Files:**
- Create: `functions/n8n-ingest.ts`

**Interfaces:**
- Consumes: secrets `N8N_INGEST_SECRET`, `OWNER_USER_ID`, `INSFORGE_BASE_URL`, `API_KEY` (admin; cek `secrets list`, tambah jika belum ada) via `Deno.env.get()`.
- Produces: `POST /functions/n8n-ingest[?dry_run=1]` + `GET /functions/n8n-ingest?action=summary`, kontrak di bawah. Task 3–5 mengandalkan kontrak ini persis.

Kontrak POST — header `x-ingest-secret: <secret>`, body:
`{ "company": "PT X", "role": "Backend Engineer", "status": "Screening", "source": "Glints", "job_url": "https://…", "notes": "…" }`
(`source`/`job_url`/`notes` opsional; `status` default `"Applied"`.)

Respons:
- `200 { "ok": true, "action": "updated", "application_id": "<uuid>", "prev_status": "Applied" }`
- `200 { "ok": true, "action": "created", "application_id": "<uuid>" }`
- `200 { "ok": true, "action": "unchanged", "application_id": "<uuid>" }` (status sama → tidak tulis)
- `200 { "ok": true, "action": "needs_review", "candidates": [{ "id": "...", "company_name": "...", "role_title": "...", "current_status": "..." }] }`
- `401 { "ok": false, "error": "unauthorized" }`, `400 { "ok": false, "error": "<sebab>" }` (status tak dikenal, company/role kosong).
- `?dry_run=1`: jalankan matcher sampai keputusan, kembalikan respons yang sama + `"dry_run": true`, tanpa tulis DB.

Kontrak GET `?action=summary` (header secret sama):
`200 { "ok": true, "by_status": { "Applied": 12, … }, "changed_24h": [{ "company_name": "...", "role_title": "...", "status": "Screening", "changed_at": "…" }], "upcoming": [{ "company_name": "...", "role_title": "...", "kind": "task_deadline|follow_up|interview", "date": "…" }] }`
(`changed_24h` dari `application_status_history` join applications ≤7 baris terbaru 24 jam; `upcoming` = `task_deadline`/`next_follow_up_date`/`interview_scheduled_at` ≥ hari ini, ≤5 baris terdekat.)

- [ ] **Step 1: Tulis function**

```typescript
import { createAdminClient } from 'npm:@insforge/sdk';

const STATUSES = ['Applied','Screening','HR Interview','Technical Interview','Offer','Accepted','Rejected','Withdrawn','Ghosted'] as const;

const STOPWORDS = new Set(['pt','cv','tbk','ltd','inc','co','the','dan','dll']);

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .join(' ');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  const secret = Deno.env.get('N8N_INGEST_SECRET') ?? '';
  if (req.headers.get('x-ingest-secret') !== secret || !secret) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const admin = createAdminClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL') ?? '',
    apiKey: Deno.env.get('API_KEY') ?? '',
  });
  const ownerId = Deno.env.get('OWNER_USER_ID') ?? '';
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry_run') === '1';

  if (req.method === 'GET' && url.searchParams.get('action') === 'summary') {
    const { data: apps } = await admin.database.from('job_applications')
      .select('id, company_name, role_title, current_status, task_deadline, next_follow_up_date, interview_scheduled_at')
      .eq('user_id', ownerId);
    const rows = apps ?? [];
    const by_status: Record<string, number> = {};
    for (const r of rows) by_status[r.current_status] = (by_status[r.current_status] ?? 0) + 1;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: hist } = await admin.database.from('application_status_history')
      .select('status, changed_at, application_id, job_applications!inner(company_name, role_title, user_id)')
      .eq('job_applications.user_id', ownerId)
      .gte('changed_at', since)
      .order('changed_at', { ascending: false })
      .limit(7);
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = rows.flatMap((r) => [
      { kind: 'task_deadline', date: r.task_deadline, row: r },
      { kind: 'follow_up', date: r.next_follow_up_date, row: r },
      { kind: 'interview', date: r.interview_scheduled_at ? String(r.interview_scheduled_at).slice(0, 10) : null, row: r },
    ])
      .filter((e) => e.date && e.date >= today)
      .sort((a, b) => (a.date as string) < (b.date as string) ? -1 : 1)
      .slice(0, 5)
      .map((e) => ({ company_name: e.row.company_name, role_title: e.row.role_title, kind: e.kind, date: e.date }));
    return json({
      ok: true,
      by_status,
      changed_24h: (hist ?? []).map((h: { status: string; changed_at: string; job_applications: { company_name: string; role_title: string } }) => ({
        company_name: h.job_applications.company_name, role_title: h.job_applications.role_title,
        status: h.status, changed_at: h.changed_at,
      })),
      upcoming,
    });
  }

  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);

  const body = await req.json().catch(() => ({}));
  const company = String(body.company ?? '').trim();
  const role = String(body.role ?? '').trim();
  const status = String(body.status ?? 'Applied').trim();
  const sourceName = String(body.source ?? '').trim();
  const jobUrl = String(body.job_url ?? '').trim();
  const notes = String(body.notes ?? '').trim();
  if (!company || !role) return json({ ok: false, error: 'company dan role wajib' }, 400);
  if (!(STATUSES as readonly string[]).includes(status)) {
    return json({ ok: false, error: `status tak dikenal: ${status}` }, 400);
  }

  // 1. match job_url persis
  let appId: string | null = null;
  let prevStatus: string | null = null;
  if (jobUrl) {
    const { data } = await admin.database.from('job_applications')
      .select('id, current_status').eq('user_id', ownerId).eq('job_url', jobUrl).limit(1);
    if (data?.length) { appId = data[0].id; prevStatus = data[0].current_status; }
  }
  // 2. match normalisasi company (+ role mengandung)
  let candidates: Array<{ id: string; company_name: string; role_title: string; current_status: string }> = [];
  if (!appId) {
    const first = normalize(company).split(' ')[0] ?? '';
    const { data } = await admin.database.from('job_applications')
      .select('id, company_name, role_title, current_status')
      .eq('user_id', ownerId)
      .ilike('company_name', `%${first}%`)
      .limit(10);
    candidates = (data ?? []).filter((r) => normalize(r.company_name) === normalize(company));
    const roleNorm = normalize(role);
    const roleHit = candidates.filter((r) => normalize(r.role_title).includes(roleNorm) || roleNorm.includes(normalize(r.role_title)));
    if (roleHit.length === 1) { appId = roleHit[0].id; prevStatus = roleHit[0].current_status; }
    else if (candidates.length === 1 && !roleNorm) { appId = candidates[0].id; prevStatus = candidates[0].current_status; }
  }
  if (!appId && candidates.length > 0) {
    return json({ ok: true, action: 'needs_review', dry_run: dryRun || undefined, candidates });
  }

  // find-or-create source
  let sourceId: string | null = null;
  const resolvedSource = sourceName || 'Website Perusahaan';
  const { data: src } = await admin.database.from('sources')
    .select('id').eq('user_id', ownerId).eq('name', resolvedSource).limit(1);
  if (src?.length) sourceId = src[0].id;
  else if (!dryRun) {
    const { data: created } = await admin.database.from('sources')
      .insert([{ user_id: ownerId, name: resolvedSource }]).select('id');
    sourceId = created?.[0]?.id ?? null;
  }

  if (dryRun) {
    return json({ ok: true, dry_run: true, action: appId ? (prevStatus === status ? 'unchanged' : 'updated') : 'created', application_id: appId });
  }

  if (appId) {
    if (prevStatus === status) return json({ ok: true, action: 'unchanged', application_id: appId });
    await admin.database.from('job_applications').update({ current_status: status }).eq('id', appId);
    return json({ ok: true, action: 'updated', application_id: appId, prev_status: prevStatus });
  }
  const { data: inserted } = await admin.database.from('job_applications').insert([{
    user_id: ownerId, company_name: company, role_title: role, source_id: sourceId,
    current_status: status, job_url: jobUrl || null, notes: notes || null,
  }]).select('id');
  return json({ ok: true, action: 'created', application_id: inserted?.[0]?.id ?? null });
}
```

- [ ] **Step 2: Deploy**

Run: `npx -y @insforge/cli functions deploy n8n-ingest --file ./functions/n8n-ingest.ts --name "n8n ingest" --description "Ingest lamaran dari n8n (secret-guarded)"`
Expected: created. Lalu Run: `npx -y @insforge/cli functions list` — Expected: `n8n-ingest` berstatus `active`.

- [ ] **Step 3: Verifikasi kontrak (tanpa tulis DB)**

Run: `npx -y @insforge/cli functions invoke n8n-ingest --method POST --data "{\"company\":\"PT Uji\",\"role\":\"QA\",\"status\":\"Bogus\"}"`
Expected: error status tak dikenal (membuktikan allowlist jalan; invoke tanpa secret? CLI invoke memakai auth sendiri — jika function menolak karena header secret hilang, tambahkan langkah: uji via curl dengan header. Catat hasil aktual sebagai koreksi kontrak bila perlu).
Lalu uji dry_run + summary via curl dengan header `x-ingest-secret` (nilai dari Task 1 Step 2):
`curl -s -X POST "$BASE/functions/n8n-ingest?dry_run=1" -H "x-ingest-secret: $SECRET" -H "Content-Type: application/json" -d "{\"company\":\"GoTo\",\"role\":\"Backend\",\"status\":\"Screening\"}"`
Expected: `{"ok":true,"dry_run":true,…}` dan tidak ada baris baru di DB (cek via `db query "SELECT COUNT(*) FROM job_applications"` sebelum/sesudah — sama).
`$BASE` = `oss_host` dari `.insforge/project.json`.

- [ ] **Step 4: Uji tulis sungguhan + trigger history, lalu bersihkan**

Run (curl, tanpa dry_run): body `{ "company": "PT Uji Hapus", "role": "QA Tester", "status": "Applied", "source": "Glints" }`
Expected: `action: created` + uuid. Verifikasi: `db query "SELECT current_status FROM job_applications WHERE id='<uuid>'"` → Applied; `db query "SELECT status FROM application_status_history WHERE application_id='<uuid>'"` → 1 baris Applied (dari trigger, bukan function). Update: kirim lagi dengan `status: Screening` → `action: updated, prev_status: Applied`; history jadi 2 baris. Bersihkan: `db query "DELETE FROM job_applications WHERE id='<uuid>'"` (cascade hapus history).

- [ ] **Step 5: Commit**

```bash
git add functions/n8n-ingest.ts
git commit -m "feat: edge function n8n-ingest (secret-guarded upsert + summary)"
```

---

### Task 3: n8n lokal via Docker

**Files:**
- Create: `n8n/docker-compose.yml`

**Interfaces:**
- Consumes: Docker Desktop terinstall (user, lihat runbook).
- Produces: n8n di `http://localhost:5678`. Task 4–5 mengandalkan ini.

- [ ] **Step 1: Tulis compose**

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=Asia/Jakarta
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

- [ ] **Step 2: Jalankan**

Run: `docker compose -f n8n/docker-compose.yml up -d` (dari repo root)
Expected: `docker ps` menunjukkan container n8n; buka `http://localhost:5678` → setup akun owner n8n (user lakukan di browser).

- [ ] **Step 3: Commit**

```bash
git add n8n/docker-compose.yml
git commit -m "chore: n8n local docker compose"
```

---

### Task 4: Workflow `email-status-ingest`

**Files:**
- Create: `n8n/email-status-ingest.json` (export dari UI setelah jadi + active)

**Interfaces:**
- Consumes: kontrak POST Task 2; kredensial Gmail OAuth2, Telegram Bot, Groq/Gemini (dibuat user di UI — runbook memandu); secret ingest Task 1 (Header Auth `x-ingest-secret`).
- Produces: workflow aktif; file JSON export ter-commit.

Node (bangun di UI, pakai typeVersion bawaan instalasi lokal):
1. **Gmail Trigger** — poll every 10 minutes; filter `from:(jobstreet.co.id OR jobstreet.com OR glints.com OR linkedin.com OR dealls.com)` + `newer_than:7d` saat awal. Sederhanakan: satu trigger `subject:(lamaran OR application OR interview OR status)` bila filter sender terlalu sempit — putuskan saat uji dengan email asli user.
2. **Code `Normalize`** — input: subject, body (text), from. Output: `{ sender, subject, body }` (body dipotong 4000 karakter).
3. **Information Extractor `ParseEmail`** (fallback LLM; template rules per sender ditambah kemudian bila pola stabil) — model: Groq `llama-3.3-70b-versatile` (atau Gemini `gemini-2.0-flash`); output schema:
   `{ "type": "object", "properties": { "company": { "type": "string" }, "role": { "type": "string" }, "portal_status": { "type": "string" }, "job_url": { "type": "string" } }, "required": ["company", "role", "portal_status"] }`
   System prompt: "Ekstrak dari email notifikasi lamaran kerja. portal_status = status mentah sesuai teks email (contoh: 'Lamaran Dilihat', 'Shortlisted', 'Interview Invitation'). job_url = tautan loker bila ada, else ''."
4. **Code `MapStatus`** — tabel mapping (edit langsung di node ini agar user bisa tambah tanpa redeploy):
   `Dilihat/Viewed/Seen → Screening; Diproses/In Review/Shortlisted/Shortlist → Screening; Interview/Diundang/Wawancara → HR Interview; Offer/Offering → Offer; Diterima/Accepted/Hired → Accepted; Ditolak/Rejected → Rejected; Dibatalkan/Withdrawn → Withdrawn` (case-insensitive, contains-match; tak cocok → `null`).
   Output: `{ company, role, status: <mapped|null>, source: <portal dari sender>, job_url, notes: subject }`.
5. **HTTP Request `Ingest`** — POST `https://5fr37au2.ap-southeast.insforge.app/functions/n8n-ingest`, Header `x-ingest-secret: <secret>`, JSON body = output MapStatus. (Base URL = `oss_host` `.insforge/project.json`; ganti jika branch backend dipakai.)
6. **IF `NeedsReview?`** — `{{ $json.action }}` = needs_review → **Telegram `Review`** : "⚠️ Perlu cek manual: *{{company}} – {{role}}* ({{status}}). Kandidat: …" (susun dari `candidates[]`). Else → **IF `Changed?`** action updated/created → **Telegram `Done`**: "✅ *{{company}} – {{role}}*: {{prev}} → {{status}}" / "➕ Baru: *{{company}} – {{role}}* ({{status}})".
7. **Error Trigger + Telegram `Alarm`** — semua error workflow → "🔥 n8n error: …".

- [ ] **Step 1: Kredensial (user di UI, pandu via runbook)** — Gmail OAuth2, Telegram bot token + chat ID, Groq/Gemini API key.
- [ ] **Step 2: Bangun node 1–7 di UI sesuai spec di atas.**
- [ ] **Step 3: Uji dry-run** — ubah node Ingest URL tambah `?dry_run=1`, Execute manual dengan 3 email asli (1 update cocok, 1 tak cocok/ambigu, 1 status tak dikenal). Expected: updated / needs_review / 400 tanpa tulis DB.
- [ ] **Step 4: Produksi** — hapus `dry_run`, Activate workflow. Kirim 1 email uji (forward email asli) → cek baris berubah di app + notif Telegram masuk.
- [ ] **Step 5: Export + commit** — Export workflow JSON → simpan `n8n/email-status-ingest.json`.
```bash
git add n8n/email-status-ingest.json
git commit -m "feat: n8n workflow email-status-ingest"
```

---

### Task 5: Workflow `daily-summary`

**Files:**
- Create: `n8n/daily-summary.json` (export dari UI)

**Interfaces:**
- Consumes: kontrak GET summary Task 2; kredensial Telegram (Task 4).
- Produces: rekap Telegram tiap 07:00 WIB.

Node: **Schedule Trigger** (`0 7 * * *`, timezone Asia/Jakarta) → **HTTP Request** GET `…/functions/n8n-ingest?action=summary` (header secret) → **Code `Format`**:
```
☀️ Rekap lamaran (7 Sep)
Aktif: Applied 12 · Screening 4 · HR Interview 2 · Offer 1
Berubah 24 jam: PT X – Backend → Screening
Deadline dekat: PT Y – QA (task 9 Sep)
```
(lewati baris kosong bila tidak ada) → **Telegram**.

- [ ] **Step 1: Bangun di UI.**
- [ ] **Step 2: Uji** — Execute manual → pesan Telegram sesuai format, angka cocok dengan dashboard app.
- [ ] **Step 3: Activate, export, commit.**

```bash
git add n8n/daily-summary.json
git commit -m "feat: n8n workflow daily-summary"
```

---

### Task 6: Runbook user (langkah non-coding, detail)

**Files:**
- Create: `docs/n8n-runbook.md`

**Interfaces:**
- Consumes: semua nilai konkret dari Task 1–5 (URL, nama kredensial, filter final).
- Produces: panduan yang bisa diikuti tanpa bertanya lagi.

Isi wajib (langkah bernomor + screenshot-placeholder berupa deskripsi posisi tombol, bukan gambar):
1. Install Docker Desktop → verifikasi `docker ps`.
2. `docker compose -f n8n/docker-compose.yml up -d` → buka localhost:5678 → buat akun owner.
3. Gmail: Credentials → OAuth2 (Client ID/Secret dari Google Cloud Console; redirect URL dari n8n) → test koneksi.
4. Telegram: chat ke BotFather → /newbot → simpan token; chat ID via @userinfobot; buat kredensial di n8n + kirim pesan tes.
5. LLM: daftar Groq (atau AI Studio Gemini) → API key → kredensial di n8n.
6. Tempel `N8N_INGEST_SECRET` (diberikan saat implementasi) sebagai Header Auth di node Ingest.
7. Daftarkan sender portal yang dipakai; uji 3 email (prosedur Task 4 Step 3).
8. Operasional: n8n hanya jalan saat laptop on + Docker running; update via `docker compose pull && up -d`; backup otomatis di volume `n8n_data` (+ export JSON tiap ubah workflow).

- [ ] **Step 1: Tulis runbook.**
- [ ] **Step 2: Commit.**

```bash
git add docs/n8n-runbook.md
git commit -m "docs: n8n user runbook"
```

---

## Self-Review

1. **Spec coverage:** hosting lokal Docker (§1) → Task 3; Gmail trigger+extract+map (§2) → Task 4; edge function secret/matcher/upsert/summary/dry_run (§3) → Task 2; Telegram satu arah + rekap 07:00 (§4) → Task 4–5; testing (§5) → Task 2 Step 3–4 + Task 4 Step 3–4; user steps (§6) → Task 6. Owner-resolve via secret (spec §4.3) → Task 1 Step 1+3 + Task 2 `OWNER_USER_ID`. ✅
2. **Placeholder scan:** semua step berisi perintah/kode/nilai konkret; satu-satunya yang ditentukan saat eksekusi adalah filter Gmail final (diputuskan dari email asli user — ditandai eksplisit) dan nilai secret (dihasilkan Task 1). ✅
3. **Type consistency:** kontrak `action` (`updated|created|unchanged|needs_review`) dipakai identik di Task 2 (function), Task 4 (IF nodes), dan format Telegram. Field summary (`by_status`, `changed_24h`, `upcoming`) identik di Task 2 dan Task 5. ✅

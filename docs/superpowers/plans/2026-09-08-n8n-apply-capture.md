# n8n Apply Capture Fase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satu-klik capture lamaran baru (bookmarklet desktop + bot Telegram mobile) menjadi `Applied` di tracker via sub-workflow parse bersama.

**Architecture:** Dua pintu masuk (Webhook localhost + Telegram Trigger) memanggil satu sub-workflow `parse-job-url` (fetch → teks → LLM extract → sanitasi → POST edge function fase 1). Kredensial, secret, edge function, dan pola Telegram reuse fase 1.

**Tech Stack:** n8n self-host (Docker lokal), Gemini free tier (kredensial existing), InsForge edge function `n8n-ingest`, vanilla JS bookmarklet.

## Global Constraints

- Tanpa tunnel, tanpa VPS, tanpa biaya baru, tanpa secret/kredensial baru (reuse fase 1: `x-ingest-secret`, bot Telegram, Gemini).
- Enum tak dikenal dari LLM → null (jangan tebak). Nilai data existing (9 status, employment_type, work_arrangement) tidak diubah.
- Tidak ada tulis DB saat uji (`?dry_run=1`); baris test live dihapus (COUNT kembali).
- JSON workflow tanpa properti `credentials`, secret = `__PASTE_SECRET_IN_UI__`, `active: false` + top-level `id` (kebutuhan import CLI fase 1).
- Frequent commits (satu commit per task yang mengubah repo).

---

## File Structure

- Create `n8n/parse-job-url.json` — sub-workflow: terima `{url,title?,text?}` → kembalikan hasil edge.
- Create `n8n/apply-bookmarklet.json` — Webhook POST `/apply` → sub-workflow → Telegram confirm.
- Create `n8n/apply-telegram.json` — Telegram Trigger → URL vs `Perusahaan | Role` → sub-workflow/direct → Telegram.
- Create `n8n/bookmarklet.js` — snippet `javascript:` satu baris.
- Modify `docs/n8n-runbook.md` — append bagian fase 2 (install bookmarklet, test, publish).

---

### Task 1: Sub-workflow `parse-job-url`

**Files:**
- Create: `n8n/parse-job-url.json`

**Interfaces:**
- Consumes: edge function POST contract fase 1 (body `{company, role, status, source?, job_url?, location?, employment_type?, work_arrangement?, salary_min?, salary_max?, job_description?, notes?}` → `{ok, action, application_id?, prev_status?, candidates?[]}`); base `https://5fr37au2.ap-southeast.insforge.app`; secret placeholder.
- Produces: sub-workflow callable via Execute Workflow node, input `{url, title?, text?}`, output = edge response + `{company, role}` echo. Tasks 2–3 rely on this exact I/O.

- [ ] **Step 1: Write the workflow JSON**

Nodes (typeVersions: pakai yang diterima instalasi lokal; bila import menolak, sesuaikan dan catat — pola fase 1):
1. `Execute Workflow Trigger` — input `{url, title?, text?}` (wajib: `url` non-empty; kosong → return `{ok:false, error:'url wajib'}` via Code guard pertama).
2. `Code Fetch Prep` — passthrough (validasi url diawali http).
3. `HTTP Request FetchPage` (`n8n-nodes-base.httpRequest`) — GET `={{ $json.url }}`, responseFormat text, timeout 20000, followRedirects true, `onError: continueRegularOutput` (gagal → item empty, lanjut pakai `text` kiriman).
4. `Code ToText` — ambil body fetch (atau `''` bila gagal) → strip tags: `.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')` → collapse whitespace → `pageText = clean.slice(0,6000)`; `fallback = ($json.text ?? '').slice(0,6000)`; output `{url, title, text: pageText || fallback}`. Bila keduanya kosong → output `{empty:true}`.
5. `IF HasText` — `text` kosong → `Telegram AskManual`? TIDAK (sub-workflow tanpa Telegram; kembalikan `{ok:false, error:'tidak bisa baca halaman'}` agar caller yang memutuskan). True → lanjut.
6. `Information Extractor ParseJob` (LLM, kredensial user di UI, model `gemini-3.7-flash`) — text `={{ $json.text }}`, schemaType fromJson, schema:
   `{"type":"object","properties":{"company":{"type":"string"},"role":{"type":"string"},"location":{"type":"string"},"employment_type":{"type":"string"},"work_arrangement":{"type":"string"},"salary_min":{"type":"number"},"salary_max":{"type":"number"}},"required":["company","role"]}`
   systemPrompt (verbatim): "Ekstrak dari teks lowongan kerja. employment_type hanya salah satu dari: Full-time, Contract, Internship, Part-time, else ''. work_arrangement hanya salah satu dari: Remote, Hybrid, Onsite, else ''. salary_min/salary_max angka dalam Rupiah (mis. 'Rp 5-7 juta' → 5000000 dan 7000000), else null. Jangan mengarang: tidak ada di teks → '' atau null."
7. `Code BuildPayload` — unwrap `raw.output ?? raw` (pelajaran fase 1); sanitasi enum:
   `const ET=['Full-time','Contract','Internship','Part-time'], WA=['Remote','Hybrid','Onsite']`
   `employment_type = ET.includes(v) ? v : null` (sama untuk WA); `num = (x) => (typeof x === 'number' && isFinite(x) ? x : null)`;
   source dari domain: `u.includes('jobstreet')?'JobStreet':u.includes('glints')?'Glints':u.includes('linkedin')?'LinkedIn':u.includes('dealls')?'Dealls':'Website Perusahaan'`;
   output `{company, role, status:'Applied', source, job_url:url, location:||null, employment_type, work_arrangement, salary_min:num(...), salary_max:num(...), job_description:text.slice(0,4000), notes:title||null}`.
   company/role kosong → return `{ok:false, error:'company dan role wajib'}` (jangan panggil edge).
8. `HTTP Request Ingest` — POST `{base}/functions/n8n-ingest` (+`?dry_run=1` saat uji, hapus sebelum produksi), header `x-ingest-secret: __PASTE_SECRET_IN_UI__`, body `={{ JSON.stringify($json) }}`, responseFormat json.
9. Output = edge response digabung `{company, role}` (Code MergeEcho: `{...edgeJson, company, role}`).

- [ ] **Step 2: Import + verifikasi struktural**

Run: `docker cp n8n/parse-job-url.json n8n-n8n-1:/tmp/pju.json` lalu `docker exec n8n-n8n-1 n8n import:workflow --input=/tmp/pju.json`
Expected: success. Verifikasi via export round-trip: 9 node + connections utuh, inactive. JANGAN activate (sub-workflow tidak perlu active untuk dipanggil? CATAT hasil aktual: bila harus active agar callable, aktifkan dan catat di report).

- [ ] **Step 3: Uji dry-run via Execute**

Di UI: tambahkan `?dry_run=1` di node Ingest, Execute sub-workflow manual dengan input `{url:'<URL loker asli>', title:'...', text:''}`.
Expected: output `{ok:true, dry_run:true, action:'created'|'updated'|'needs_review', ...}` + company/role terisi; COUNT DB tidak berubah (cek via `db query "SELECT COUNT(*) FROM job_applications"`). Ulangi 3 URL berbeda (1 cocok existing → updated/unchanged, 1 baru → created, 1 ambigu → needs_review).

- [ ] **Step 4: Commit**

```bash
git add n8n/parse-job-url.json
git commit -m "feat: n8n sub-workflow parse-job-url (dry-run verified)"
```

---

### Task 2: `apply-bookmarklet` + bookmarklet.js

**Files:**
- Create: `n8n/apply-bookmarklet.json`, `n8n/bookmarklet.js`

**Interfaces:**
- Consumes: `parse-job-url` I/O (Task 1).
- Produces: webhook URL `http://localhost:5678/webhook/apply`; Telegram confirm format (Task 3 reuse pola yang sama).

- [ ] **Step 1: Tulis `n8n/bookmarklet.js`** (verbatim, satu baris, awali `javascript:`):

```js
javascript:(function(){var u=location.href;var t=document.title;var s=(window.getSelection?window.getSelection().toString():'').slice(0,2000);var m=document.querySelector('meta[name="description"]');var d=m?(m.content||''):'';fetch('http://localhost:5678/webhook/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:u,title:t,text:(s||d).slice(0,4000)})}).then(function(r){return r.text()}).then(function(x){alert('Lamaranku: '+x.slice(0,200))}).catch(function(e){alert('Lamaranku gagal: '+e)})})();
```

- [ ] **Step 2: Tulis `n8n/apply-bookmarklet.json`** — node:
1. `Webhook` (POST, path `apply`, responseMode `lastNode` agar bookmarklet dapat balasan).
2. `Execute Workflow parse-job-url` — panggil sub-workflow Task 1 dengan `{{ $json }}` (url/title/text).
3. `IF CreatedOk` — `{{ $json.action }}` equals `created` → true `Telegram Done`, false → `Telegram Review` (reuse template pesan fase 1: created → "➕ Baru: *{company} – {role}* ({source})"; else → "⚠️ Perlu cek manual: *{company} – {role}*. Kandidat: …" + reason bila ada).
   Telegram nodes: type telegram v1.2, TANPA properti credentials (user attach di UI).
4. Error path: `IF Ok` (`{{ $json.ok }}` true?) false → `Telegram Alarm` "🔥 Capture gagal: {{ $json.error }}" (pola fix-wave fase 1).

- [ ] **Step 3: Import + uji dry-run via curl (simulasi bookmarklet)**

Import seperti Task 1. Pastikan node Ingest di sub-workflow masih `?dry_run=1`. Run:
`curl.exe -s -X POST http://localhost:5678/webhook/apply -H "Content-Type: application/json" --data "@$env:TEMP\bm.json"` dengan bm.json = `{"url":"<URL loker asli>","title":"Test Title","text":""}`
Expected: respons JSON `{ok:true, dry_run:true, ...}` + Telegram Done/Review masuk (node Telegram jalan saat test — kredensial existing fase 1). COUNT DB tidak berubah.

- [ ] **Step 4: Commit**

```bash
git add n8n/apply-bookmarklet.json n8n/bookmarklet.js
git commit -m "feat: n8n apply-bookmarklet + bookmarklet.js"
```

---

### Task 3: `apply-telegram` (URL + fallback manual)

**Files:**
- Create: `n8n/apply-telegram.json`

**Interfaces:**
- Consumes: `parse-job-url` I/O; bot Telegram kredensial existing (user attach di UI).
- Produces: pola Telegram confirm konsisten dengan Task 2.

- [ ] **Step 1: Tulis `n8n/apply-telegram.json`** — node:
1. `Telegram Trigger` (updates `['message']`, kredensial user di UI) — hanya proses pesan mengandung `http` ATAU `|` (filter di Code berikutnya; trigger sendiri ambil semua pesan bot).
2. `Code Route` — `text = message.text ?? ''`; `urls = text.match(/https?:\/\/[^\s]+/g) ?? []`; bila `urls.length` → output `{kind:'url', url:urls[0]}`; else bila `text.includes('|')` → `{kind:'manual', text}`; else → `{kind:'ignore'}` (stop, tanpa notif — cegah loop dari pesan confirm bot sendiri; PLUS filter: abaikan pesan dari bot itu sendiri via `message.from.is_bot`).
3. `IF Kind` (switch 3 cabang):
   - `url` → `Execute Workflow parse-job-url` `{url}` → IF CreatedOk → Telegram Done/Review (template sama Task 2) + IF Ok false → Telegram Alarm.
   - `manual` → `Code SplitManual` (`[company, role] = text.split('|').map(s=>s.trim())`; kosong → Telegram "Format: Perusahaan | Role") → `HTTP Request Ingest` langsung (body `{company, role, status:'Applied', source:'Website Perusahaan'}`, header placeholder, dry_run saat uji) → Telegram confirm.
   - `ignore` → no-op.
4. ANTI-LOOP WAJIB: cabang ignore untuk pesan tanpa URL/`|` DAN untuk `message.from.is_bot == true` (balasan confirm bot tidak boleh memicu dirinya sendiri). Catat implementasi exact di report.

- [ ] **Step 2: Import + uji dry-run**

Import seperti Task 1. Sub-workflow masih dry_run. Uji: kirim URL loker ke bot via Telegram → Expected: Telegram Done/Review masuk, COUNT DB tidak berubah. Uji fallback: kirim `PT Contoh | QA Engineer` → Expected: confirm masuk (dry_run, tanpa tulis).

- [ ] **Step 3: Commit**

```bash
git add n8n/apply-telegram.json
git commit -m "feat: n8n apply-telegram (URL + manual fallback)"
```

---

### Task 4: Live test + publish + runbook

**Files:**
- Modify: `docs/n8n-runbook.md` (append bagian fase 2)

**Interfaces:**
- Consumes: ketiga workflow + edge + Telegram.

- [ ] **Step 1: Live create sungguhan**

Hapus `?dry_run=1` HANYA di salinan? TIDAK — prosedur aman: uji live via curl ke webhook dengan 1 URL loker asli (Ingest tanpa dry_run karena flag dihapus dari node sub-workflow — CATAT: hapus flag → test → hasil di bawah).
Expected: `{ok:true, action:'created', application_id}` + Telegram "➕ Baru". Verifikasi: `db query` baris ada + history tepat 1 baris Applied + source ter-resolve benar.

- [ ] **Step 2: Bersihkan + kembalikan dry_run? TIDAK** — produksi memang tanpa dry_run. Hapus baris test: `db query "DELETE FROM job_applications WHERE id='<uuid>'"`; verifikasi COUNT kembali + history 0. Hapus juga source bila ter-create baru dan hanya dipakai baris test (cek `SELECT id FROM job_applications WHERE source_id='<src>'` kosong dulu).

- [ ] **Step 3: Publish + link error workflow**

Di UI (pandu user bila implementer tak punya browser — catat sebagai user step bila begitu): Publish `parse-job-url` (bila perlu callable), `apply-bookmarklet`, `apply-telegram` (version `v1 - capture produksi`); set Error Workflow = `error-alarm` di ketiga workflow (error-alarm sendiri tetap kosong).

- [ ] **Step 4: Runbook fase 2** — append ke `docs/n8n-runbook.md` section `## Fase 2 — Capture saat apply`: install bookmarklet (drag file/buat bookmark manual + cara pakai: buka loker → apply → klik bookmarklet → alert confirm), Telegram mobile (kirim URL / format manual), uji yang sudah dilakukan + hasilnya, operasional (laptop on; pesan Telegram antre), troubleshooting (alert gagal → n8n on?; fetch gagal → tempel teks/manual; duplikat → cek job_url).

- [ ] **Step 5: Commit + push?** — Commit files: `git add n8n/ docs/n8n-runbook.md && git commit -m "feat: fase 2 apply capture live + runbook"`. PUSH hanya bila user menyetujui eksplisit di sesi ini; default JANGAN push (tulis keputusan di report).

- [ ] **Step 6: Verifikasi akhir** — `git status --short` (hanya file task ini), `git log --oneline -5`, COUNT DB = baseline, tidak ada `?dry_run=1` tersisa di JSON produksi (`Select-String n8n/*.json dry_run` → hanya boleh muncul bila disengaja; hapus).

---

## Self-Review

1. **Spec coverage:** sub-workflow (§2) → Task 1; bookmarklet workflow+JS (§2) → Task 2; telegram workflow+fallback (§2) → Task 3; enum→null + domain map + kolom tersimpan (§4) → Task 1 Step 1 (sanitasi + payload); error handling (§6) → tiap task; user steps (§7) → Task 4 runbook. Tanpa tunnel (§5.1) ✅; sub-workflow tunggal (§5.2) ✅; create langsung (§5.3) + ambigu ikut fase 1 ✅; reuse secret/kredensial (§5.4) ✅.
2. **Placeholder scan:** semua node + schema + prompt + pesan + perintah konkret; URL/secret/base exact; tidak ada TBD ✅.
3. **Type consistency:** I/O `parse-job-url` (`{url,title?,text?}` → edge response + company/role) dipakai identik di Task 2–3; format Telegram konsisten; `dry_run` lifecycle eksplisit ✅.

# Spec: n8n Apply Capture Fase 2 (Pendekatan A — tanpa tunnel)

Tanggal: 2026-09-08
Status: approved untuk implementasi

## 1. Tujuan

Mencatat lamaran baru ke tracker dengan satu klik saat apply (desktop bookmarklet,
mobile bot Telegram), tanpa pencatatan manual. Melengkapi fase 1 (update via email).

## 2. Scope

**In scope:**
- Sub-workflow n8n `parse-job-url` (Execute Workflow trigger): input `{url, title?, text?}`
  → fetch halaman (fallback ke `text`) → LLM extract → map sumber dari domain →
  POST edge function `n8n-ingest` (`status: 'Applied'`) → kembalikan hasil.
  (Map domain→sumber: jobstreet→JobStreet, glints→Glints, linkedin→LinkedIn,
  dealls→Dealls, else Website Perusahaan; find-or-create seperti fase 1.)
- Workflow `apply-bookmarklet`: Webhook POST `/apply` (localhost) → sub-workflow → Telegram confirm.
- Workflow `apply-telegram`: Telegram Trigger (URL di pesan, bot existing) → sub-workflow
  yang sama → Telegram confirm. Fetch gagal → balas minta format `Perusahaan | Role`,
  pesan balasan diparse split sederhana → catat langsung.
- File repo `n8n/bookmarklet.js`: kumpulkan `location.href`, `document.title`,
  selected text, meta description → POST localhost webhook.
- Kredensial LLM reuse fase 1 (Gemini). Secret + edge function reuse fase 1.
- Mode `?dry_run=1` untuk uji; export JSON ke repo; runbook user (install bookmarklet, test).

**Non-goals (fase 2b+):** Cloudflare Tunnel + share-sheet native, browser extension,
deteksi otomatis momen Apply, aturan "abaikan" email kedaluwarsa (keputusan terpisah).

## 3. Arsitektur

```
Desktop: portal → Apply → klik bookmarklet → POST localhost:5678/webhook/apply {url,title,text}
Mobile:  portal app → Apply → kirim URL ke bot → Telegram Trigger → ambil URL dari pesan
  │ (pesan antre di cloud Telegram bila laptop mati; diproses saat on)
  ▼
parse-job-url: fetch URL (fallback: text kiriman) → LLM extract → sumber dari domain
  → POST /functions/n8n-ingest {status:'Applied', job_url:url, ...} → Telegram "➕ Baru"
```

## 4. Nilai tersimpan (kolom job_applications)

company_name, role_title (LLM); source_id (domain→find-or-create); job_url (URL, kunci dedup);
location, employment_type, work_arrangement, salary_min/max (LLM bila jelas, else null);
job_description (teks halaman, potong ~4000 char); current_status='Applied';
applied_date=today (default DB); user_id=owner (dikunci function).
Tidak diisi: kontak, follow-up, interview, offer, task (manual/email fase 1).
Enum tak dikenal dari LLM → null (jangan tebak). Duplikat mustahil (matcher job_url + normalisasi).

## 5. Keputusan kunci

1. Tanpa tunnel: bookmarklet localhost + Telegram polling tembus NAT.
2. Satu sub-workflow dipakai dua pintu masuk (hemat duplikasi, satu titik uji).
3. Capture = intent eksplisit user → create langsung (bukan needs_review),
   kecuali matcher menemukan kandidat ambigu (ikut aturan fase 1).
4. Secret, edge function, kredensial LLM/bot reuse fase 1 — tidak ada secret baru.

## 6. Error handling & testing

- Fetch gagal total (mobile): minta `Perusahaan | Role`, parse split, catat.
- LLM gagal / field wajib kosong → `needs_review` Telegram (jangan tulis).
- Edge 4xx/5xx → alarm via jalur existing.
- Uji: 3 URL dry-run → 1 create sungguhan → verifikasi app → hapus baris test.

## 7. Yang perlu dilakukan user (di luar coding)

1. Drag `n8n/bookmarklet.js` ke bookmarks bar (atau buat bookmark manual).
2. Di HP: buka chat bot, kirim URL test.
3. Uji dry-run 3 URL + 1 real, verifikasi Telegram + app, lalu Publish 3 workflow.

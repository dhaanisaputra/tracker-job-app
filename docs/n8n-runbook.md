# Runbook n8n Email Auto-Ingest (Job Tracker)

Panduan untuk pemula n8n. Semua langkah non-coding ada di sini. Tidak ada nilai secret/key/token di dokumen ini — hanya cara mendapatkannya.

Prasyarat: repo ini sudah di-clone di laptop. Semua perintah dijalankan dari root repo (`D:\Project-Study\Tracker Job App\tracker-job-app` atau folder clone Anda), kecuali disebut lain.

Alur singkat: **Gmail Trigger** polling Gmail → **Code Normalize** → **ParseEmail** (Information Extractor + LLM) → **Code MapStatus** → **HTTP Request Ingest** (POST ke edge function `n8n-ingest`) → **IF Ok** → **IF NeedsReview** → **Telegram Review** / **IF Changed** → **Telegram Done**. Gagal ingest (`ok: false`) → **Telegram Alarm** (`🔥 Ingest gagal: ...`). `unchanged` diam tanpa notif (by design). Workflow kedua: **Schedule Trigger** → **HTTP Request Summary** → **Code Format** → **Telegram** (rekap 07:00 WIB). Workflow ketiga: **error-alarm** (**Error Trigger** → **Telegram**) — pasang sebagai Error Workflow di kedua workflow di atas (langkah di §9).

---

## 1. Install Docker Desktop

1. Download Docker Desktop untuk Windows dari situs resmi Docker, install, restart jika diminta.
2. Buka Docker Desktop, tunggu statusnya running (ikon paus tidak lagi animasi / tertulis "Engine running").
3. Verifikasi di PowerShell:
   ```powershell
   docker ps
   ```
   Berhasil jika perintah jalan tanpa error (daftar container boleh kosong).

## 2. Jalankan n8n lokal + buat akun owner

1. Dari root repo, jalankan:
   ```powershell
   docker compose -f n8n/docker-compose.yml up -d
   ```
2. Cek `docker ps` — harus ada container image `n8nio/n8n` dengan port `5678`.
3. Buka `http://localhost:5678` di browser.
4. Saat pertama dibuka, n8n meminta pembuatan akun owner (email + nama + password). Isi dan simpan — ini akun admin n8n lokal Anda.
5. Import workflow (sudah ada di repo, status nonaktif): di n8n klik **⋯ ( titik tiga, pojok kanan atas header workflow list/editor — menu "⋯" → Import from File)** → pilih `n8n/email-status-ingest.json`, ulangi untuk `n8n/daily-summary.json` dan `n8n/error-alarm.json`. Biarkan ketiganya **Inactive** dulu sampai langkah 7 selesai.

## 3. Kredensial Gmail (OAuth2)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat project (atau pakai yang ada) → **APIs & Services → Library** → aktifkan **Gmail API**.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → tipe **Web application**. Tambahkan diri Anda sebagai test user di **OAuth consent screen** jika diminta.
3. Di n8n: buka workflow `email-status-ingest` → klik node **Gmail Trigger** → bagian **Credential** → **Create new** → tipe **Gmail OAuth2 API**.
4. Di dialog kredensial n8n ada kolom **OAuth Redirect URL** (tertera di bagian atas/bawah form kredensial, contoh format `http://localhost:5678/rest/oauth2-credential/callback`). Salin URL itu.
5. Kembali ke Google Cloud Console → di OAuth client yang dibuat tadi → **Authorized redirect URIs** → tempel redirect URL dari n8n → **Save**.
6. Kembali ke n8n → isi **Client ID** dan **Client Secret** dari Google → klik **Connect my account** → login dengan akun Gmail yang menerima email portal → izinkan akses.
7. Test koneksi: n8n menampilkan status terhubung (nama akun). Lalu di node **Gmail Trigger** pastikan filter polling: `from:(jobstreet.co.id OR jobstreet.com OR glints.com OR linkedin.com OR dealls.com)`, poll tiap 10 menit.

## 4. Kredensial Telegram (bot + chat ID + uji emoji)

1. Di Telegram, chat ke **@BotFather** → kirim `/newbot` → ikuti prompt (nama + username bot) → BotFather memberi **token bot**. Simpan token itu di tempat aman (jangan di-commit).
2. Cari tahu chat ID Anda: chat ke **@userinfobot** → ia membalas dengan ID numerik Anda. Catat.
3. Di n8n: **Credentials → New → Telegram** (atau dari node **Telegram Review** / **Telegram Done** / **Telegram** di workflow `daily-summary` → Credential → Create new) → isi **Access Token** dengan token bot → **Save**.
4. Isi **Chat ID** di node Telegram berikut (chatId kosong di JSON repo — wajib diisi di UI, jangan commit nilainya):
    - Workflow `email-status-ingest`: node **Telegram Review**, **Telegram Done**, **Telegram Alarm**.
    - Workflow `daily-summary`: node **Telegram**.
    - Workflow `error-alarm`: node **Telegram**.
5. Kirim pesan tes: buka node Telegram yang mau dites → klik **Execute step** pada node itu saja (jangan full-run workflow dengan data dummy) → cek pesan masuk di Telegram Anda.
6. Verifikasi format: pesan harus menampilkan **emoji** (⚠️ / ✅ / ➕ / ☀️) dan **teks tebal** (tanda `*...*` dirender bold, bukan tampil sebagai bintang mentah). Jika bintang tampil mentah atau emoji jadi `?`, buka node Telegram → **Additional Fields / Parse Mode** → set ke **Markdown** (atau MarkdownV2) → tes ulang.

## 5. Kredensial LLM (dipasang ke node ParseEmail)

1. Pilih salah satu (gratis):
   - **Groq**: daftar di situs Groq → buat API key (model yang dipakai workflow: `llama-3.3-70b-versatile`).
   - **Atau Google AI Studio (Gemini)**: daftar → buat API key (model alternatif: `gemini-2.0-flash`).
2. Di n8n: **Credentials → New** → pilih tipe kredensial sesuai model yang dipakai (mis. Groq / Google Gemini / OpenAI-compatible sesuai node LLM yang tersedia di instalasi Anda) → tempel API key → **Save**.
3. Buka workflow `email-status-ingest` → node **ParseEmail** (tipe Information Extractor) → di bagian **Model / Language Model** attach kredensial dari langkah 2.
4. Pastikan schema dan system prompt node **ParseEmail** tidak berubah:
   - Output schema JSON: `company`, `role`, `portal_status` (wajib), `job_url` (opsional).
   - System prompt: ekstrak `portal_status` mentah sesuai teks email, `job_url` tautan loker bila ada.

## 6. Tempel N8N_INGEST_SECRET sebagai Header Auth

Nilai secret tidak tertulis di runbook ini. Caranya:

1. Minta nilainya ke operator (orang yang menjalankan setup backend). Operator mendapatkannya dengan perintah:
   ```powershell
   npx -y @insforge/cli secrets get N8N_INGEST_SECRET
   ```
   (Perintah ini dijalankan operator, bukan Anda — Anda hanya menerima nilainya lewat jalur aman.)
2. Di n8n, buka workflow `email-status-ingest` → node **HTTP Request Ingest** → bagian **Headers** → temukan header bernama `x-ingest-secret` yang nilainya masih `__PASTE_SECRET_IN_UI__` → ganti dengan nilai secret dari operator. URL node tetap `https://5fr37au2.ap-southeast.insforge.app/functions/n8n-ingest`, method POST.
3. Ulangi di workflow `daily-summary` → node **HTTP Request Summary** → header `x-ingest-secret` yang nilainya `__PASTE_SECRET_IN_UI__` → ganti dengan nilai yang sama. URL node tetap `https://5fr37au2.ap-southeast.insforge.app/functions/n8n-ingest?action=summary`, method GET.
4. Jangan simpan nilai secret di file, screenshot, atau chat yang di-forward. Jika mengekspor ulang workflow ke JSON, pastikan nilai secret tidak ikut ter-commit (biarkan placeholder atau bersihkan sebelum commit).

## 7. Daftarkan sender portal + uji 3 email + go-live

1. **Daftarkan sender portal yang Anda pakai.** Filter bawaan node **Gmail Trigger** hanya menangkap `jobstreet.co.id`, `jobstreet.com`, `glints.com`, `linkedin.com`, `dealls.com`. Jika Anda memakai portal lain (mis. Kalibrr, JobStreet subdomain lain, email perusahaan langsung), tambahkan domainnya ke filter `from:(...)` di node **Gmail Trigger** dan catat daftar finalnya. Mapping pengirim → nama sumber ada di node **Code MapStatus** (JobStreet / Glints / LinkedIn / Dealls, selain itu jadi `Website Perusahaan`).
2. **Uji dry-run (tidak menulis DB):**
   - Di node **HTTP Request Ingest**, tambahkan sementara `?dry_run=1` di akhir URL sehingga menjadi `https://5fr37au2.ap-southeast.insforge.app/functions/n8n-ingest?dry_run=1`.
   - Siapkan 3 email asli yang mewakili 3 kasus: (a) email yang cocok dengan lamaran yang sudah ada di app (harusnya `updated`); (b) email ambigu/tidak cocok dengan data mana pun (harusnya `needs_review`); (c) email dengan status tak dikenal (harusnya error `400` status tak dikenal).
   - Jalankan workflow manual per email (**Execute** / test workflow dengan email tersebut) dan catat hasil di tab output node **HTTP Request Ingest**. Hasil yang diharapkan: 1× `updated`, 1× `needs_review`, 1× error `400`. Mode `dry_run` tidak menulis ke database, aman diulang.
3. **Go-live 1 email asli:**
   - Hapus `?dry_run=1` dari URL node **HTTP Request Ingest** (kembalikan ke URL produksi).
   - Forward 1 email portal asli ke inbox yang dipolling (atau tunggu email berikutnya masuk lewat trigger).
   - Cek di aplikasi job tracker: baris lamaran terkait berubah statusnya (atau baris baru muncul jika perusahaan/role belum ada).
   - Cek Telegram: notif **Telegram Done** (`✅ ...` / `➕ Baru: ...`) atau **Telegram Review** (`⚠️ Perlu cek manual: ...`) masuk sesuai kasusnya.
4. **Aktifkan kedua workflow:** di halaman workflow `email-status-ingest` dan `daily-summary`, geser toggle menjadi **Active**. Mulai sekarang ingest berjalan otomatis tiap polling.

## 8. Operasional harian

- **n8n hanya jalan saat laptop menyala dan Docker Desktop running.** Jika laptop mati/sleep, polling berhenti dan email yang masuk selama itu diproses saat n8n hidup lagi (dalam jendela filter Gmail). Untuk menjalankan: buka Docker Desktop → `docker compose -f n8n/docker-compose.yml up -d` → verifikasi `docker ps`.
- **Update n8n:**
  ```powershell
  docker compose -f n8n/docker-compose.yml pull
  docker compose -f n8n/docker-compose.yml up -d
  ```
- **Data tersimpan di volume Docker `n8n_data`** (didefinisikan di `n8n/docker-compose.yml`). Menghapus container tidak menghilangkan data selama volume tidak dihapus. Jangan jalankan `docker volume rm` / `docker compose down -v` kecuali paham risikonya.
- **Backup workflow:** setiap kali mengubah workflow di UI, ekspor ulang per workflow dan commit:
   ```powershell
   docker exec n8n-n8n-1 n8n export:workflow --id=<id-workflow> --output=/tmp/wf.json
   ```
   Cek flag yang tersedia di instalasi Anda dengan `docker exec n8n-n8n-1 n8n export:workflow --help` (nama flag output bisa berbeda antar versi n8n; alternatif: `docker exec n8n-n8n-1 n8n export:workflow --all --output=/tmp/all.json`). Lalu `docker cp n8n-n8n-1:/tmp/wf.json n8n/email-status-ingest.json` (ulangi per workflow).
   (Jika nama container berbeda, lihat dari `docker ps`.) Simpan hasilnya ke `n8n/email-status-ingest.json`, `n8n/daily-summary.json`, dan `n8n/error-alarm.json`, lalu commit seperti biasa. Pastikan tidak ada nilai secret ikut tersimpan (lihat langkah 6.4).

## 9. Troubleshooting

| Gejala | Penyebab umum | Cara perbaiki |
|---|---|---|
| Gmail error / auth expired, workflow gagal di **Gmail Trigger** | Token OAuth Google kedaluwarsa atau consent dicabut | Buka kredensial Gmail di n8n → **Reconnect** → login ulang akun Gmail → eksekusi manual node **Gmail Trigger** untuk memastikan sukses |
| Edge function balas `401 { "ok": false, "error": "unauthorized" }` di output node **HTTP Request Ingest** / **HTTP Request Summary** | Nilai header `x-ingest-secret` salah / belum ditempel | Minta ulang nilainya ke operator (langkah 6), tempel ulang di kedua node HTTP, pastikan nama header persis `x-ingest-secret` |
| Workflow tidak error tapi tidak ada notif / data tidak berubah ("mati diam-diam") | Workflow tidak aktif, atau error ter-swallow | Buka tab **Executions** di n8n → cek run terakhir dan errornya; pastikan toggle workflow **Active**; alarm error sudah terpasang: respons gagal ingest (`ok: false`) otomatis masuk ke node **Telegram Alarm**; error tak tertangani (crash node, timeout, error koneksi) diteruskan ke workflow **error-alarm** bila sudah dipasang sebagai Error Workflow (lihat baris di bawah). `unchanged` diam tanpa notif — itu by design, bukan error |
| Pasang **error-alarm** sebagai Error Workflow (langkah manual, 3 klik, ±1 menit) | Tanpa ini, crash workflow tidak mengirim alarm | Di n8n buka workflow `email-status-ingest` → **Settings** (ikon ⚙️ di editor) → **Error Workflow** → pilih `error-alarm` → **Save**. Ulangi untuk workflow `daily-summary`. Verifikasi: picu error sengaja (mis. tempel secret salah → 401) dan pastikan pesan `🔥 ...` masuk Telegram |
| Container n8n tidak jalan / `localhost:5678` tidak bisa dibuka | Docker Desktop belum running atau container stop | Buka Docker Desktop, tunggu engine running → `docker compose -f n8n/docker-compose.yml up -d` → cek `docker ps` → refresh browser |
| Rekap pagi tidak masuk (workflow `daily-summary`) | Laptop mati jam 07:00, atau node **Schedule Trigger** / **HTTP Request Summary** / secret bermasalah | Pastikan laptop + Docker menyala sebelum 07:00 WIB; cek **Executions** workflow `daily-summary`; uji manual **Execute workflow** dan cocokkan angka dengan dashboard app; cek secret (baris 401 di atas) |

---

## Fase 2 — Capture saat apply

Tiga workflow fase 2 (di repo, semua **Inactive** sampai publish): `parse-job-url` (sub-workflow: fetch halaman → LLM ekstrak → Ingest), `apply-bookmarklet` (webhook `POST /webhook/apply` → sub-workflow → Telegram), `apply-telegram` (bot Telegram → URL via sub-workflow, atau format manual `Perusahaan | Role` via Ingest langsung → Telegram). Tanpa nilai secret/key/token di dokumen ini — hanya cara mendapatkannya.

### A. Install bookmarklet (browser desktop, ±2 menit)

1. Buat bookmark baru di browser (bookmark bar terlihat). Isi URL bookmark = **persis isi file `n8n/bookmarklet.js`** (buka file, salin seluruh satu baris yang diawali `javascript:...`).
2. Cara pakai: buka halaman lowongan → klik bookmark → bookmark POST `{url, title, text}` ke `http://localhost:5678/webhook/apply` → muncul `alert` berisi ringkasan respons (`Lamaranku: ...`).
3. Syarat: n8n jalan (`docker compose -f n8n/docker-compose.yml up -d`) dan workflow `apply-bookmarklet` sudah **Active**. Kalau `alert` gagal / koneksi ditolak → n8n mati atau workflow belum Active (lihat troubleshooting di bawah).

### B. Telegram mobile (kirim URL atau manual)

1. Bot Telegram + chat ID sama seperti §4 (attach kredensial Telegram ke semua node Telegram di `apply-bookmarklet` dan `apply-telegram` — chatId kosong di JSON repo, wajib diisi di UI, jangan commit nilainya).
2. Kirim ke bot: **URL lowongan** (otomatis fetch + ekstrak) atau format manual **`Perusahaan | Role`** (contoh: `Acme Corp | Frontend Engineer`).
3. Respons bot: `➕ Baru: *Perusahaan - Role*` (created), `⚠️ Perlu cek manual: ...` (review), `Format: Perusahaan | Role` (manual tidak valid), `🔥 Capture gagal: ...` (ingest gagal).

### C. Uji live 1x (WAJIB hijau sebelum produksi tanpa dry_run)

> Baseline saat penulisan: `SELECT COUNT(*) FROM job_applications` = **56** (tanggal 2026-09-08). Ukur ulang baseline Anda sebelum uji — jangan percaya angka ini.

```powershell
# 1. Baseline
npx -y @insforge/cli db query "SELECT COUNT(*) FROM job_applications" --json
# 2. Live create via bookmarklet path (workflow apply-bookmarklet harus Active; TANPA dry_run di URL Ingest)
Invoke-WebRequest -Method POST -Uri "http://localhost:5678/webhook/apply" -ContentType "application/json" -Body '{"url":"https://example.com/lowongan-nyata-anda","title":"Judul Lowongan","text":"Teks lowongan nyata yang memuat nama perusahaan dan role"}' -UseBasicParsing
# Harapan: {ok:true, action:'created', application_id:'<uuid>'} (TANPA flag dry_run!) + Telegram "➕ Baru"
# 3. Verifikasi: baris ada + tepat 1 history Applied + source ter-resolve
npx -y @insforge/cli db query "SELECT * FROM job_applications WHERE id='<uuid>'" --json
npx -y @insforge/cli db query "SELECT * FROM application_status_history WHERE application_id='<uuid>'" --json
# 4. Cleanup WAJIB: hapus baris test, COUNT harus kembali ke baseline, history 0
npx -y @insforge/cli db query "DELETE FROM job_applications WHERE id='<uuid>'" --json
npx -y @insforge/cli db query "SELECT COUNT(*) FROM job_applications" --json
npx -y @insforge/cli db query "SELECT COUNT(*) FROM application_status_history WHERE application_id='<uuid>'" --json
# (+ hapus baris job_sources HANYA bila dibuat oleh test ini DAN tidak dipakai baris lain)
```

Cleanup mengandalkan FK cascade; bila history count ≠ 0 setelah hapus baris application, jalankan `DELETE FROM application_status_history WHERE application_id='<uuid>'` dulu (atau verifikasi cascade), lalu cek ulang.

Varian Telegram manual (workflow `apply-telegram` Active + kredensial bot terpasang): kirim `Perusahaan Test Live | Role Test Live` ke bot → harapan sama seperti di atas → cleanup dengan SQL yang sama.

### D. Publish 3 workflow (UI, ±5 menit)

1. **Urutan live-test:** (1) hapus `?dry_run=1` dari URL di **dua** node: `parse-job-url` → **HTTP Request Ingest**, dan `apply-telegram` → **HTTP Request IngestDirect** di UI, (2) jalankan uji live §C, (3) biarkan off iff hijau + cleanup selesai, else kembalikan `?dry_run=1`. (File repo masih `dry_run=ON` — disengaja sebagai default aman. Setelah publish sukses, ekspor ulang JSON dari UI dan commit agar file = produksi.)
2. **Pasang kredensial**: Telegram (semua node Telegram di `apply-bookmarklet` + `apply-telegram`, lihat §4), LLM/Gemini (node **Information Extractor ParseJob** di `parse-job-url`, lihat §5), header `x-ingest-secret` (kedua node HTTP di atas + workflow fase 1, lihat §6).
3. **Aktifkan**: toggle **Active** untuk `parse-job-url` (diekspos sebagai sub-workflow), `apply-bookmarklet`, `apply-telegram`. Versi UI: beri catatan `v1 - capture produksi` bila n8n meminta nama/versi saat publish.
4. **Pasang error-alarm**: di tiap workflow fase 2 → **Settings** (⚙️) → **Error Workflow** → pilih `error-alarm` → **Save** (cara sama seperti §9).
5. Verifikasi akhir: ulangi §C sekali lagi dalam keadaan produksi → hijau + cleanup → COUNT = baseline.

### E. Operasional

- **Laptop menyala + Docker running** adalah syarat (webhook `localhost`, polling Telegram Trigger, dan LLM call semua lewat n8n lokal). Laptop mati = capture berhenti; kiriman Telegram saat mati diproses saat n8n hidup lagi (dalam batas retensi update Telegram).
- Jangan commit nilai secret/token/chatId — placeholder `__PASTE_SECRET_IN_UI__` dan `chatId` kosong harus tetap begitu di repo.

### F. Troubleshooting fase 2

| Gejala | Penyebab umum | Cara perbaiki |
|---|---|---|
| `alert` bookmarklet gagal / koneksi ditolak | n8n mati, atau workflow `apply-bookmarklet` Inactive | `docker compose -f n8n/docker-compose.yml up -d` → cek `docker ps` → toggle workflow **Active** → coba lagi |
| Webhook balas `404` | Workflow belum **Active** (webhook hanya terdaftar saat aktif) | Aktifkan workflow di UI (§D.3) |
| Bot tidak merespons | Kredensial Telegram belum dipasang / workflow Inactive | Attach kredensial + isi chatId (§B.1), aktifkan workflow, tes **Execute step** pada node Telegram |
| Fetch gagal / `tidak bisa baca halaman` | Situs blokir bot / butuh JS / URL salah | Pakai format manual `Perusahaan \| Role` sebagai fallback |
| Duplikat lamaran | `job_url` sudah tercatat | Cek `job_url` di app — duplikat ditolak by design; pakai URL unik untuk uji |
| Edge balas `401 unauthorized` | Header `x-ingest-secret` salah / belum ditempel | Tempel ulang secret (lihat §6), pastikan nama header persis `x-ingest-secret` |
| Respons `dry_run` padahal mau produksi | Lupa lepas `?dry_run=1` di satu dari dua node | Cek kedua URL (§D.1): Ingest di `parse-job-url` DAN IngestDirect di `apply-telegram` |

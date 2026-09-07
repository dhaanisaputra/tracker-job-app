# Runbook n8n Email Auto-Ingest (Job Tracker)

Panduan untuk pemula n8n. Semua langkah non-coding ada di sini. Tidak ada nilai secret/key/token di dokumen ini — hanya cara mendapatkannya.

Prasyarat: repo ini sudah di-clone di laptop. Semua perintah dijalankan dari root repo (`D:\Project-Study\Tracker Job App\tracker-job-app` atau folder clone Anda), kecuali disebut lain.

Alur singkat: **Gmail Trigger** polling Gmail → **Code Normalize** → **ParseEmail** (Information Extractor + LLM) → **Code MapStatus** → **HTTP Request Ingest** (POST ke edge function `n8n-ingest`) → **IF NeedsReview** → **Telegram Review** / **IF Changed** → **Telegram Done**. Workflow kedua: **Schedule Trigger** → **HTTP Request Summary** → **Code Format** → **Telegram** (rekap 07:00 WIB).

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
5. Import workflow (sudah ada di repo, status nonaktif): di n8n klik **⋯ (menu, pojok kiri atas/kanan)** → **Import from File** → pilih `n8n/email-status-ingest.json`, lalu ulangi untuk `n8n/daily-summary.json`. Biarkan keduanya **Inactive** dulu sampai langkah 7 selesai.

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
4. Isi **Chat ID** di ketiga node Telegram dengan ID dari langkah 2:
   - Workflow `email-status-ingest`: node **Telegram Review**, node **Telegram Done**.
   - Workflow `daily-summary`: node **Telegram**.
5. Kirim pesan tes: buka node **Telegram Done** → klik **Execute step** / **Test step** (atau jalankan manual workflow dengan data dummy) → cek pesan masuk di Telegram Anda.
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
- **Backup workflow:** setiap kali mengubah workflow di UI, ekspor ulang dan commit:
  ```powershell
  docker exec n8n-n8n-1 n8n export:workflow --all
  ```
  (Jika nama container berbeda, lihat dari `docker ps`.) Simpan hasilnya ke `n8n/email-status-ingest.json` dan `n8n/daily-summary.json`, lalu commit seperti biasa. Pastikan tidak ada nilai secret ikut tersimpan (lihat langkah 6.4).

## 9. Troubleshooting

| Gejala | Penyebab umum | Cara perbaiki |
|---|---|---|
| Gmail error / auth expired, workflow gagal di **Gmail Trigger** | Token OAuth Google kedaluwarsa atau consent dicabut | Buka kredensial Gmail di n8n → **Reconnect** → login ulang akun Gmail → eksekusi manual node **Gmail Trigger** untuk memastikan sukses |
| Edge function balas `401 { "ok": false, "error": "unauthorized" }` di output node **HTTP Request Ingest** / **HTTP Request Summary** | Nilai header `x-ingest-secret` salah / belum ditempel | Minta ulang nilainya ke operator (langkah 6), tempel ulang di kedua node HTTP, pastikan nama header persis `x-ingest-secret` |
| Workflow tidak error tapi tidak ada notif / data tidak berubah ("mati diam-diam") | Workflow tidak aktif, atau error ter-swallow | Buka tab **Executions** di n8n → cek run terakhir dan errornya; pastikan toggle workflow **Active**; aktifkan notifikasi error (Error Trigger → node **Telegram** alarm bila tersedia di workflow Anda) |
| Container n8n tidak jalan / `localhost:5678` tidak bisa dibuka | Docker Desktop belum running atau container stop | Buka Docker Desktop, tunggu engine running → `docker compose -f n8n/docker-compose.yml up -d` → cek `docker ps` → refresh browser |
| Rekap pagi tidak masuk (workflow `daily-summary`) | Laptop mati jam 07:00, atau node **Schedule Trigger** / **HTTP Request Summary** / secret bermasalah | Pastikan laptop + Docker menyala sebelum 07:00 WIB; cek **Executions** workflow `daily-summary`; uji manual **Execute workflow** dan cocokkan angka dengan dashboard app; cek secret (baris 401 di atas) |

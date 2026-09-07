# Spec: n8n Email Auto-Ingest → Job Tracker (Fase 1)

Tanggal: 2026-09-07
Status: approved untuk implementasi

## 1. Tujuan

Mengotomasi pencatatan dan update status lamaran di tracker (single-user, POV jobseeker)
dari email notifikasi job portal, tanpa mengubah frontend / RLS / schema yang ada.

## 2. Scope

**In scope (fase 1):**
- Workflow n8n `email-status-ingest`: Gmail Trigger → extract → map status → POST edge function.
- Edge function `n8n-ingest`: validasi secret, matcher, upsert `job_applications`,
  insert `application_status_history`, find-or-create `sources`.
- Notifikasi Telegram satu arah: status ter-update, data baru, `needs_review`, error.
- Workflow n8n `daily-summary`: rekap pagi 07:00 (per status, perubahan kemarin, deadline terdekat).
- Mode `?dry_run=1` untuk uji tanpa menulis DB.

**Non-goals (fase 2+):**
- Bookmarklet / share-sheet saat apply (butuh Cloudflare Tunnel).
- Perubahan UI, schema, RLS.
- Tombol aksi interaktif di Telegram.

## 3. Arsitektur

```
Gmail (JobStreet/Glints/LinkedIn/Dealls)
  │ poll 10 mnt (Gmail Trigger, filter sender)
  ▼
n8n (Docker lokal, localhost:5678 — "laptop on = sinkronisasi jalan")
  │ extract: template rules per sender → fallback LLM (Groq/Gemini free tier)
  │ output: { company, role, portal_status, job_url? }
  │ map: portal_status → 9 status app (tak dikenal → needs_review)
  ▼  POST /functions/n8n-ingest + header x-ingest-secret
Edge function n8n-ingest (InsForge, status active)
  │ 1. cek secret (401 jika salah)
  │ 2. matcher: job_url persis → normalisasi company+role → 1 yakin / 0-ganda
  │ 3. find-or-create sources by name; upsert job_applications (user_id = owner);
  │    insert application_status_history hanya jika status berubah
  ▼  { ok, action: updated|created|needs_review, application_id? }
Telegram (notifikasi saja)
```

## 4. Keputusan kunci

1. **n8n lokal via Docker, tanpa VPS/tunnel.** Email yang masuk saat laptop mati
   diproses saat laptop menyala (Gmail Trigger ambil sejak poll terakhir) — delay
   jam-an dapat diterima untuk update status.
2. **Jalur tulis = edge function + shared secret.** Admin key hanya di dalam function;
   n8n hanya pegang `x-ingest-secret`. Anon key tidak bisa dipakai (RLS `auth.uid()`).
3. **Single-user dijaga:** function mengunci `user_id` ke akun owner, bukan dari payload n8n.
   Owner di-resolve di dalam function dari env `OWNER_EMAIL` (InsForge secret) via
   lookup admin ke `auth.users` sekali per cold-start, lalu di-cache.
4. **Matcher konservatif:** ambigu → `needs_review` (notif Telegram, bereskan manual di app).
   Tidak ada tebakan otomatis.
5. **Telegram satu arah:** update, data baru, needs_review, error, rekap harian. Tanpa tombol.

## 5. Error handling & testing

- Retry otomatis n8n untuk 5xx/timeout; secret salah → 401 + alarm Telegram.
- n8n Error Trigger → notif error ke Telegram (anti "mati diam-diam").
- Uji: forward 5–10 email asli ke label test → dry-run → verifikasi mapping + matching → produksi.

## 6. Yang perlu dilakukan user (di luar coding)

1. Install Docker Desktop, jalankan n8n lokal via Compose (file disediakan).
2. Buat kredensial Gmail (OAuth) di n8n; buat bot Telegram via BotFather, simpan token + chat ID.
3. Buat API key LLM gratisan (Groq/Gemini) untuk fallback extractor.
4. Daftarkan sender email portal yang dipakai (JobStreet, Glints, LinkedIn, Dealls, …).
5. Terima secret `x-ingest-secret` dari implementasi → simpan sebagai kredensial n8n.
6. Uji dry-run dengan email asli, lalu buka keran produksi.

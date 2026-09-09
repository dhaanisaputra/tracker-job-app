# Lamaranku — Tracker Job App

Aplikasi pelacak lamaran kerja pribadi (single-user): catat lamaran, pantau status,
lihat statistik, dan terima update otomatis. Bahasa Indonesia + English.

**Live:** https://lacakkerja.insforge.site

## Stack

- Next.js (App Router) + React 19 + Tailwind v4 + `@tanstack/react-query`
- Backend BaaS: [InsForge](https://insforge.dev) (Postgres + Auth OTP + RLS + Edge Functions + deploy)
- Automasi: n8n self-host (Docker lokal) + Telegram + Gemini free tier

## Fitur

- Dashboard: statistik, streak 7 hari, funnel proses, aktivitas terbaru
- Lamaran: CRUD + filter/sort/pagination, bulk aksi, import `.xlsx`/`.csv`, detail + riwayat status
- Statistik, Sumber, Akun; dark mode; multi-bahasa ID/EN (toggle di header dashboard)
- Automasi n8n: update status dari email portal (fase 1), capture satu-klik saat apply via bookmarklet/bot Telegram (fase 2)

## Struktur

```
src/app/(app)/   halaman: dashboard, lamaran, statistik, sumber, akun
src/components/  UI: lamaran-list, application-form, nav, dropdown, ...
src/lib/         i18n, stats, streak, task-state, client DB
functions/       edge function n8n-ingest (Deno, di-deploy via CLI)
n8n/             workflow JSON + bookmarklet.js + docker-compose
docs/            runbook, arsitektur workflow, specs, plans
```

## Pengembangan lokal

```bash
npm install
npm run dev        # http://localhost:3000
npx tsc --noEmit   # typecheck (abaikan error functions/: file Deno)
```

Env (` .env.local`, jangan commit): `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`.

## Deploy & backend

```bash
npx -y @insforge/cli deployments deploy .   # frontend
npx -y @insforge/cli functions deploy n8n-ingest --file ./functions/n8n-ingest.ts
```

## Dokumen

- `docs/n8n-runbook.md` — setup & operasional n8n (pengguna)
- `docs/n8n-workflows.md` — arsitektur automasi
- `docs/superpowers/specs/` — spec fitur; `docs/superpowers/plans/` — rencana implementasi

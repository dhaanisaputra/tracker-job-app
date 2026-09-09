# n8n Workflows — Dokumentasi Arsitektur

> Pendamping `docs/n8n-runbook.md` (runbook = **cara pakai**; file ini = **apa & kenapa**).
> Status: fase 1 + fase 2 live. Semua workflow `active`, dry_run OFF (produksi).

## Arsitektur

```
A. EMAIL (fase 1, polling Gmail/10 mnt)
Gmail ──► email-status-ingest ──► edge n8n-ingest ──► DB ──► Telegram
                                          ▲
B. CAPTURE (fase 2, event-driven)         │
Bookmarklet ──► apply-bookmarklet ──┐     │
Bot Telegram ──► apply-telegram ───┴──► parse-job-url ──► edge ──► DB ──► Telegram
                                          ▲
C. RINGKASAN: Schedule 07:00 ──► daily-summary ──► edge (summary) ──► Telegram
D. ALARM: Error Trigger ──► error-alarm ──► Telegram (terpasang di semua workflow)
```

Prinsip: satu pintu tulis (`n8n-ingest`), matcher konservatif (ambigu → `needs_review`,
bukan tebak), Telegram satu arah (notif saja), tanpa tunnel/VPS/biaya baru.

## Backend: edge function `n8n-ingest`

- Auth: header `x-ingest-secret` (secret `N8N_INGEST_SECRET`); admin key hanya di function.
- POST body: `{company, role, status, source?, job_url?, location?, employment_type?,
  work_arrangement?, salary_min?, salary_max?, job_description?, notes?}`.
- Matcher: `job_url` persis → normalisasi `company+role` (+role mengandung) →
  1 yakin = tulis; 0/ganda = `needs_review` (+candidates).
- Tulis: find-or-create `sources`, insert/update `job_applications` (`user_id` dikunci
  owner `OWNER_USER_ID`); riwayat via trigger DB (jangan insert manual).
- Respons: `{ok, action: updated|created|unchanged|needs_review, application_id?, prev_status?, candidates?[]}` / `401` / `400`. `?dry_run=1` = simulasi tanpa tulis.
- GET `?action=summary` → `{by_status, changed_24h (≤7), upcoming (≤5)}`.
- `status: null` eksplisit → `needs_review` + reason (bukan default Applied).

## Fase 1

### email-status-ingest
| # | Node | Fungsi |
|---|------|--------|
| 1 | Gmail Trigger | Poll 10 mnt, filter `from:(jobstreet… OR glints… OR linkedin… OR dealls…)` |
| 2 | Code Normalize | `{sender, subject, body≤4000}` |
| 3 | Information Extractor ParseEmail | Gemini → `{company, role, portal_status, job_url}` |
| 4 | Code MapStatus | portal_status → 9 status app (tak cocok → null); sumber dari sender |
| 5 | HTTP Request Ingest | POST edge (secret header) |
| 6 | IF NeedsReview / IF Changed | `needs_review` → Telegram Review; updated/created → Telegram Done; unchanged diam |
| 7 | IF Ok → Telegram Alarm | `ok:false` (mis. 400/401) → alarm (bukan diam) |

Map status (contains, case-insensitive): Dilihat/Viewed/Seen→Screening;
Diproses/In Review/Shortlisted→Screening; Interview/Diundang/Wawancara→HR Interview;
Offer→Offer; Diterima/Accepted/Hired→Accepted; Ditolak/Rejected/**Maaf**→Rejected;
Dibatalkan/Withdrawn→Withdrawn; **kedaluwarsa/kadaluwarsa/expired/tidak lagi menerima→Ghosted**.

### daily-summary
Schedule `0 7 * * *` Asia/Jakarta → GET summary → format (`Aktif:` per status,
`Berubah 24 jam:`, `Deadline dekat:`; baris kosong dilewati) → Telegram.

### error-alarm
Error Trigger → Telegram `🔥 …`. Terpasang sebagai Error Workflow di semua workflow
 lain (kecuali dirinya sendiri — anti infinite loop).

## Fase 2

### parse-job-url (sub-workflow, dipanggil, bukan dipicu langsung)
Input `{url, title?, text?}` (passthrough) → output = respons edge + echo company/role.
| # | Node | Fungsi |
|---|------|--------|
| 1 | IF ValidUrl | Guard `trim().startsWith('http')` (toleran spasi) |
| 2 | HTTP FetchPage | GET + UA browser + timeout 20s + follow redirect + continue-on-error |
| 3 | Code ToText | Strip script/style/tags → `text = (fallback + page)[..6000]` (fallback dulu) |
| 4 | IF HasText | Kosong → `{ok:false}` (caller yang putuskan) |
| 5 | Information Extractor ParseJob | Gemini → company/role/location/employment_type/work_arrangement/salary_min/max |
| 6 | Code BuildPayload | Unwrap `raw.output ?? raw`; enum allowlist→else null; sumber dari domain (jobstreet→JobStreet, glints→Glints, linkedin→LinkedIn, dealls→Dealls, else Website Perusahaan); job_description ≤4000; kosong → stop |
| 7 | HTTP Ingest | POST edge; IF HasCompany gate sebelumnya |
| 8 | Code MergeEcho | Gabung respons edge + echo; error lokal (`url wajib` / `tidak bisa baca` / `company dan role wajib`) |

### apply-bookmarklet
Webhook POST `/apply` (responseMode lastNode) → **Code UnwrapBody** (`body` envelope → flat;
WAJIB — output webhook = `{headers,params,query,body}`, bukan JSON langsung!) →
Execute parse-job-url → IF Ok → Alarm; IF CreatedOk → Done (`➕ Baru`) / Review (`⚠️`).

### apply-telegram
Telegram Trigger (`updates:['message']`, BUTUH webhook HTTPS publik — lihat Tailscale) →
Code Route: `is_bot` atau tanpa URL/`|` → `ignore` diam (anti-loop!); URL → sub-workflow;
`Perusahaan | Role` → SplitManual → POST edge langsung → Done. IF/Telegram sama persis
dengan bookmarklet (template identik byte-for-byte).

### bookmarklet.js (`n8n/bookmarklet.js`)
Snippet `javascript:`: URL + judul tab + teks terseleksi (≤2000, else meta description)
→ POST localhost webhook → `alert` hasil. Desktop only.

## Infrastruktur

- `n8n/docker-compose.yml`: n8n + `WEBHOOK_URL=https://<mesin>.<tailnet>.ts.net/`
  (Tailscale Funnel; localhost untuk akses UI). Funnel: `tailscale funnel 5678` (terminal terbuka).
- Secrets (nilai HANYA di backend/n8n, tidak di repo): `N8N_INGEST_SECRET`, `OWNER_USER_ID`.
- Kredensial n8n (attach di UI): Gmail OAuth2, Telegram bot (+chatId tiap node),
  Gemini (model `gemini-3.7-flash`), header secret di 2 node Ingest.
- File repo (`n8n/`): 6 workflow JSON (placeholder, `active:false`, tanpa credentials) +
  `bookmarklet.js` + compose. Repo TIDAK menyimpan nilai secret/chatId.

## Pelajaran sesi debug (jangan ulangi)

1. **Envelope webhook**: output Webhook node = `{headers,params,query,body}` — unwrap dulu.
2. **IF butuh `operation`**: boolean tanpa `"operation":"true"` = kondisi kosong = selalu false.
3. **Re-import menimpa nilai UI** (secret/chatId kembali placeholder) — tempel ulang setelah import.
4. **`webhookId` top-level** node (bukan di parameters) agar webhook terdaftar.
5. **Telegram Trigger = webhook HTTPS** (localhost ditolak) → Tailscale Funnel.
6. **Publish ≠ langsung aktif**: registrasi webhook kadang butuh restart container.
7. **Schema extractor default California** — selalu cek Schema Type + prompt setelah import.
8. **Fetch bisa kena bot-wall** (Glints share-URL) → teks bookmarklet sebagai andalan.
9. **Gemini 503 sesaat** → retry; kalau persisten cek kuota/key di AI Studio.

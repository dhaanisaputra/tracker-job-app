# Spec: Multi-bahasa ID–EN + Language Toggle (Pendekatan A)

Tanggal: 2026-09-07
Status: approved untuk implementasi (constraint: implementasi JANGAN di-commit/push dulu)

## 1. Tujuan

Seluruh UI app (ID default) bisa diganti ke English via toggle di sebelah theme toggle,
persist antar reload. Tanpa dependensi baru, tanpa restrukturisasi routing.

## 2. Scope (seluruh app sekaligus)

**In scope — string UI di:**
- Shell: `nav.tsx` (menu, brand subtitle bila ada, keluar, streak), `page-header.tsx`,
  `theme-toggle.tsx` (aria-label), `language-toggle.tsx` (baru).
- Dashboard: `dashboard/page.tsx` + semua komponennya
  (`stat-card`, `streak-trail`, `funnel`, `momentum-chart` incl. label chart, `task-badge`, `lamaran-list` compact).
- Lamaran: `lamaran/page.tsx`, `lamaran-list.tsx` (full: search placeholder, filter, sort header,
  pagination, bulk bar, empty state, dialog hapus), `[id]/page.tsx`, `[id]/edit/page.tsx`,
  `baru/page.tsx`, `import/page.tsx` + `application-form.tsx`, `bulk-import.tsx`,
  `confirm-dialog.tsx`, `confirm-delete.tsx`, `dropdown.tsx` (placeholder di call-site), `modal.tsx`, `toast` text.
- Statistik: `statistik/page.tsx`, `statistik-client.tsx`, `range-filter.tsx`.
- Sumber: `sumber/page.tsx`, `sources-client.tsx`, `source-list.tsx`, `edit-dialog.tsx`.
- Akun: `akun/page.tsx`, `profile-form.tsx` (incl. toast sukses + error inline).
- Auth: `sign-in/page.tsx`, `sign-in/code/page.tsx` (incl. countdown, resend, error).
- Server actions user-facing errors (`akun/actions.ts`, `lamaran/[id]/actions.ts`,
  `sumber/actions.ts`, `statistik/actions.ts`, `auth-actions.ts`): baca lang dari cookie.
- Metadata root layout (`title`/`description`) mengikuti lang cookie.

**Non-goals:**
- Nilai data/DB tidak diterjemahkan: 9 status, employment_type, work_arrangement,
  nama sumber bawaan, isi catatan/gaji/tanggal milik user.
- Format locale tanggal/angka (follow-up terpisah).
- Bahasa ketiga.

## 3. Arsitektur

```
cookie `lang=id|en` (+ localStorage mirror)
  │ dibaca server: root layout → <html lang data-lang>
  │ dibaca server: server components/actions via cookies() + getDict()
  ▼
LanguageProvider (client context, init dari document.documentElement.dataset.lang)
  │ useLang() → { lang, t, setLang }
  ▼  toggle: set cookie + localStorage + <html> attrs + router.refresh()
Komponen client pakai t('section.key'); server pakai getDict(lang).section.key
```

## 4. Keputusan kunci

1. **Hand-rolled, nol dependensi** (next-intl ditolak: overkill 2 bahasa statis).
2. **Cookie sebagai source of truth** (bukan localStorage saja) agar server render
   cocok dengan client → tanpa hydration mismatch. Toggle: cookie (path=/, max-age 1 thn)
   + localStorage + `router.refresh()` (tanpa reload penuh).
3. **Kamus flat key** di `src/lib/i18n.ts`: `t('nav.dashboard')`. Default `id`;
   cookie tidak valid → `id`.
4. **English ditulis natural** (bukan terjemahan kata-per-kata); owner review saat uji.
5. **Penempatan toggle**: di sebelah ThemeToggle di header dashboard
   (satu-satunya lokasi theme toggle saat ini).
6. **Server actions**: baca `cookies().get('lang')` untuk pesan error user-facing.

## 5. File baru / ubah

- Baru: `src/lib/i18n.ts` (LANGS, Lang, dict id/en, getDict, t-helper),
  `src/components/language-provider.tsx` (provider + useLang),
  `src/components/language-toggle.tsx` (tombol ID|EN compact).
- Ubah: `src/app/layout.tsx` (baca cookie, html attrs, provider bungkus app),
  `dashboard/page.tsx` (toggle di sebelah ThemeToggle),
  semua file §2 (ganti string hardcode → t()/getDict()).
- Tidak disentuh: schema/RLS/API/edge function/n8n.

## 6. Testing & constraint

- `npx tsc --noEmit` harus pass.
- Uji manual: toggle ID→EN→ID di dashboard; reload (persist); tiap halaman dicek
  tidak ada sisa string bahasa campur; EN dibaca owner untuk naturalness.
- **CONSTRAINT: hasil implementasi JANGAN di-commit maupun di-push** sampai owner bilang.

# PRD: Job Application Tracker

**Versi:** 1.1
**Tanggal:** 5 Agustus 2026
**Target pengguna:** Single user (personal tool)
**Status:** Draft — siap untuk implementasi

---

## 1. Latar Belakang & Masalah

Saat melamar kerja dari berbagai sumber (LinkedIn, JobStreet, Glints, situs karier perusahaan, dll), pelamar sering:

- Lupa apakah sudah pernah apply ke perusahaan/role tertentu atau belum.
- Tidak punya catatan progression lamaran (masih di tahap apa, kapan terakhir update).
- Kesulitan melihat gambaran besar: berapa banyak yang masih pending, berapa yang ditolak, berapa yang lanjut interview.

Aplikasi ini menjadi *single source of truth* untuk semua lamaran kerja yang pernah diajukan, terlepas dari platform sumbernya.

## 2. Tujuan Produk (Goals)

1. Mencatat setiap lamaran kerja beserta detail lengkapnya (perusahaan, role, sumber, deskripsi pekerjaan, dll).
2. Mencegah pelamar lupa/duplikat apply ke perusahaan & role yang sama.
3. Melacak progression status lamaran dari waktu ke waktu (riwayat, bukan cuma status terakhir).
4. Menyediakan tampilan tabel yang bisa di-filter, sort, search, dan pagination untuk navigasi cepat.
5. Biaya operasional serendah mungkin (idealnya $0/bulan untuk skala single-user).

## 3. Non-Goals (Di Luar Scope MVP)

- Integrasi otomatis/scraping data dari LinkedIn, JobStreet, Glints (isi data tetap manual/manual-paste untuk MVP).
- Multi-user/kolaborasi tim, role & permission.
- Notifikasi email/push otomatis (bisa jadi phase 2).
- Import/export massal dari sumber eksternal (bisa jadi phase 2, kecuali export CSV sederhana).

## 4. Target Pengguna

Satu pengguna (pemilik akun), login untuk keamanan data pribadi & supaya app bisa diakses dari device manapun. Tidak perlu sistem multi-tenant/role di MVP, tapi struktur data tetap disiapkan berbasis `user_id` supaya gampang di-extend kalau nanti mau dipakai lebih dari satu orang.

## 5. Functional Requirements

### 5.1 Autentikasi

- Login via InsForge Auth (JWT-based) — rekomendasi pakai **magic link (email OTP)** supaya tidak perlu kelola password sama sekali (paling simpel & aman untuk kebutuhan personal).
- Alternatif: email + password kalau ingin akses lebih cepat tanpa cek email tiap login.
- Session persist di browser (tidak perlu login ulang tiap buka app).

### 5.2 Manajemen Lamaran (CRUD)

Setiap lamaran punya field berikut:

| Field | Tipe | Wajib? | Keterangan |
|---|---|---|---|
| Nama perusahaan | text | Ya | |
| Role/posisi | text | Ya | |
| Sumber lamaran | select | Ya | LinkedIn / JobStreet / Glints / Indeed / Website Perusahaan / Referral / Lainnya |
| Link lowongan | url | Tidak | |
| Deskripsi pekerjaan | textarea | Tidak | Bisa paste dari job posting |
| Lokasi | text | Tidak | |
| Tipe pekerjaan | select | Tidak | Full-time / Contract / Internship / Part-time |
| Arrangement | select | Tidak | Remote / Hybrid / Onsite |
| Range gaji | number-number | Tidak | Min-max, opsional |
| Tanggal apply | date | Ya | Default hari ini |
| Status saat ini | select | Ya | Lihat state machine di 5.4 |
| Contact person | text | Tidak | Nama recruiter/HR jika ada |
| Catatan | textarea | Tidak | Free text |
| Tanggal follow-up berikutnya | date | Tidak | Untuk reminder manual |

Fitur: create, edit, delete (dengan konfirmasi), dan **view detail** yang menampilkan seluruh field secara lengkap termasuk deskripsi pekerjaan penuh dan timeline riwayat status (lihat mockup di bagian 9).

Catatan tipe data: `job_description` menggunakan tipe `text` di Postgres. Postgres tidak membedakan "long text" vs "varchar" seperti MySQL — tipe `text` sudah unbounded (tidak ada batas panjang) dan disimpan secara efisien lewat mekanisme TOAST, jadi tidak perlu tipe data khusus lain untuk deskripsi job yang panjang.

### 5.3 Deteksi Duplikat

Saat user menambah lamaran baru, sistem melakukan pengecekan (fuzzy match nama perusahaan menggunakan `pg_trgm`) terhadap data yang sudah ada milik user tersebut. Jika ditemukan kemiripan tinggi, tampilkan peringatan lembut sebelum submit:

> "Kamu pernah apply ke **Gojek** untuk role **Frontend Engineer** pada 28 Jul 2026 (status: Interview). Tetap lanjut tambah lamaran baru?"

User tetap bisa lanjut submit (misal: apply role berbeda di perusahaan yang sama), ini hanya warning, bukan hard block.

### 5.4 Progression / Status Tracking

State/status yang tersedia (bisa disesuaikan lewat pengaturan di kemudian hari, untuk MVP hardcode dulu):

```
Applied → Screening → HR Interview → Technical Interview → Offer → Accepted
                                                          ↘ Rejected
                                                          ↘ Withdrawn
                                                          ↘ Ghosted (tidak ada respon > 2-3 minggu)
```

Setiap kali `current_status` berubah, sistem otomatis mencatat perubahan tersebut (timestamp) ke tabel riwayat — lihat skema di bagian 7. Di halaman detail lamaran, user bisa melihat timeline progression-nya.

### 5.5 Table View: Filter, Sort, Search, Pagination

Berlaku di semua tampilan tabel (untuk MVP hanya ada satu tabel utama: daftar lamaran):

- **Search**: berdasarkan nama perusahaan atau role (debounced, real-time).
- **Filter**: berdasarkan status, sumber, rentang tanggal apply.
- **Sort**: klik header kolom (tanggal apply, nama perusahaan, status) — asc/desc.
- **Pagination**: 10-20 baris per halaman (server-side pagination lewat range/offset query InsForge SDK supaya tetap ringan meski datanya sudah ratusan baris).

Kolom yang ditampilkan di tabel utama: Perusahaan, Role, Sumber (nama sumber + ikon link eksternal ke `job_url` jika ada), Tanggal apply, Status (badge berwarna), dan Aksi (ikon view detail, edit, delete). Multi-select checkbox di setiap baris untuk mendukung bulk delete/bulk update status (lihat 5.8).

### 5.6 Dashboard Ringkasan

Untuk menghindari duplikasi informasi dengan halaman Statistik (5.10), kartu ringkasan di Dashboard sengaja dibatasi ke 2 metrik yang sifatnya **actionable** (bukan analitik historis):

- **Total lamaran** — angka mentah, konteks cepat.
- **Perlu ditindaklanjuti** — jumlah lamaran dengan `next_follow_up_date` atau `interview_scheduled_at` yang sudah lewat/dalam 2 hari ke depan.

Metrik analitik yang lebih dalam (growth, funnel, distribusi sumber) dipindahkan ke halaman Statistik tersendiri — lihat 5.10 dan struktur navigasi di 9.1.

### 5.7 Manajemen Sumber Lamaran (Sources)

Sumber lamaran (LinkedIn, JobStreet, Glints, dll) disimpan di tabel terpisah `sources`, bukan hardcode, supaya user bisa CRUD sumbernya sendiri secara fleksibel (tambah sumber baru, ubah nama, hapus yang tidak dipakai). Saat user pertama kali daftar, sistem otomatis mengisi 6 sumber default lewat trigger di database (lihat bagian 8), supaya tidak mulai dari kosong. Halaman pengaturan sumber cukup berupa list sederhana dengan tombol tambah/edit/hapus — tidak perlu filter/sort/pagination kompleks karena jumlah sumber biasanya sedikit (belasan).

Sumber yang masih dipakai oleh minimal satu lamaran tidak bisa dihapus langsung (dicegah lewat `on delete restrict` di database) — user harus reassign lamaran tersebut ke sumber lain dulu.

### 5.8 Metode CRUD: Single-entry vs Bulk Import

Dua metode CRUD didukung, untuk kebutuhan berbeda:

1. **Single-entry (utama)** — form tambah/edit satu lamaran, ini flow yang dipakai sehari-hari.
2. **Bulk import via Excel/CSV** — untuk migrasi data lama dari spreadsheet atau menambah banyak lamaran sekaligus. Alurnya:
   - User upload file `.xlsx` atau `.csv`.
   - Sistem parse file (client-side, pakai library `xlsx`/SheetJS untuk Excel atau `papaparse` untuk CSV) dan tampilkan preview tabel hasil parsing.
   - Tiap baris dicek kemiripan nama perusahaan terhadap data yang sudah ada (query `pg_trgm` yang sama seperti deteksi duplikat single-entry, dijalankan per baris).
   - Baris yang terindikasi duplikat ditandai (misal warna kuning) dengan opsi untuk di-uncheck sebelum konfirmasi import.
   - Setelah dikonfirmasi, seluruh baris di-insert sekaligus (batch insert).
3. **Bulk actions di tabel** — checkbox multi-select di setiap baris tabel dashboard untuk bulk delete atau bulk update status, tanpa perlu lewat Excel untuk perubahan kecil sehari-hari.

### 5.9 Flow Lanjutan: Interview & Offer

Saat status lamaran diubah menjadi salah satu tahap interview (`HR Interview`/`Technical Interview`), form update status menampilkan field opsional **jadwal interview berikutnya** (`interview_scheduled_at`).

Saat status diubah menjadi `Offer`, form menampilkan field opsional **nominal offer** (`offer_salary`) dan **deadline keputusan** (`offer_deadline`) — berguna kalau user memegang lebih dari satu offer bersamaan dan perlu membandingkan sebelum deadline masing-masing.

Keputusan akhir (lanjut ke status `Accepted` atau `Rejected`) tetap lewat mekanisme update status biasa, dan otomatis tercatat di `application_status_history`. Detail tambahan lain (hasil interview, feedback recruiter, dll) cukup ditulis bebas di kolom `notes` — tidak dibuatkan field terstruktur baru untuk tiap kemungkinan skenario, supaya skema tetap simpel dan tidak over-engineered untuk kebutuhan single-user.

### 5.10 Analitik & Gamifikasi (Halaman Statistik)

Halaman terpisah dari Dashboard (lihat 9.1), berisi 3 visualisasi dengan tujuan berbeda — bukan sekadar variasi chart, tiap tipe dipilih sesuai bentuk datanya:

1. **Applications Growth (line chart)** — tren jumlah lamaran per minggu, 8-12 minggu terakhir. Cocok pakai line chart karena datanya deret waktu.
2. **Success rate per tahap (bar chart horizontal)** — persentase lamaran yang **pernah mencapai** tiap tahap (Applied → Screening → Interview → Offer), dihitung dari `application_status_history`, bukan cuma `current_status` — supaya lamaran yang akhirnya ditolak tetap terhitung sempat mencapai tahap Interview misalnya. Bentuknya funnel/menurun, paling jelas divisualisasikan sebagai bar horizontal.
3. **Distribusi sumber (donut chart)** — proporsi lamaran per sumber (LinkedIn/JobStreet/Glints/dll). Data proporsional seperti ini paling natural sebagai pie/donut.

**Counter harian & streak** (ditampilkan di Dashboard, bukan Statistik, karena sifatnya actionable/motivasional harian):

- **Counter harian**: jumlah lamaran dengan `applied_date = current_date`.
- **Streak**: jumlah hari berturut-turut (mundur dari hari ini) di mana user apply minimal 1 lamaran. Dihitung dari daftar tanggal unik `applied_date` milik user — begitu ada gap satu hari, streak berhenti dihitung.

**Pendekatan query yang efisien**: keempat metrik di atas (growth, success rate, distribusi sumber, streak+counter harian) digabung dalam **satu Edge Function** (`dashboard-stats`) yang dipanggil sekali per kunjungan ke Dashboard/Statistik, menjalankan beberapa CTE sekaligus di database dan mengembalikan satu JSON gabungan — bukan 4-5 query terpisah dari client. Ini menghemat round-trip network sekaligus bandwidth (relevan untuk batas free tier InsForge di 5GB/bulan). Contoh query mentahnya ada di bagian 8.1.

## 6. Non-Functional Requirements

- **Biaya**: $0/bulan untuk penggunaan personal (dalam batas free tier InsForge — lihat bagian 11).
- **Performa**: tabel/list tetap responsif untuk data hingga ~1.000+ baris (pagination server-side, index database yang tepat).
- **Mobile-first**: tampilan dioptimalkan untuk mobile terlebih dahulu, baru menyesuaikan (adaptive) ke layar desktop/web — lihat 9.0 dan 9.1.
- **Keamanan & isolasi data**: Row Level Security (RLS) aktif di semua tabel (`sources`, `job_applications`, `application_status_history`), memastikan data hanya bisa diakses pemiliknya sendiri. Tidak ada key rahasia (service/secret key) yang pernah diekspos ke client — hanya public/anon key yang dibatasi RLS yang dipakai di browser; key rahasia (kalau dibutuhkan Edge Function) disimpan sebagai environment variable server-side saja.
- **Efisiensi query**: hindari `select *`, ambil kolom yang benar-benar dipakai; gunakan index yang sudah didefinisikan (lihat 8); agregasi analitik digabung dalam satu Edge Function per halaman (lihat 5.10) untuk meminimalkan jumlah request dan bandwidth/egress yang terpakai (relevan untuk batas 5GB/bulan free tier).
- **Performa UI/transisi**: gunakan TanStack Query untuk caching & background refetch (hindari flicker saat pindah halaman), optimistic update saat create/update/delete, skeleton loading state (bukan layar kosong), transisi CSS singkat (150-200ms) tanpa animasi berat, dan lazy-load library chart hanya di halaman Statistik supaya Dashboard tetap ringan.
- **Kejelasan & non-ambiguitas UI**: satu aksi = satu tempat (tidak ada tombol/menu duplikat untuk fungsi yang sama), status dan label ditulis eksplisit (bukan ikon tanpa keterangan), state kosong/loading/error selalu ada pesan yang jelas.

## 7. Tech Stack & Arsitektur

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend | Next.js (App Router) + React + TypeScript | Familiar, ekosistem besar, bisa langsung di-host di InsForge |
| Styling/UI | Tailwind CSS + shadcn/ui, font via `next/font/google` (Unbounded, Plus Jakarta Sans, IBM Plex Mono) | Komponen table/form siap pakai; font di-self-host otomatis oleh Next.js, gratis, tanpa layout shift |
| List/table logic | TanStack Table (desktop) + card list custom (mobile) | Satu sumber data, tampilan menyesuaikan breakpoint (mobile-first) |
| Grafik & analitik | Chart.js | Ringan, cukup untuk line/bar/donut chart kebutuhan personal |
| State & caching | TanStack Query | Caching, optimistic update, transisi mulus tanpa flicker |
| Backend/DB/Auth/Storage/Hosting | **InsForge** (Postgres + Auth + RLS + Storage + Edge Functions + Site Deployment) | Satu platform mencakup database, auth, dan hosting frontend sekaligus — sesuai permintaan, free tier generous |
| Data fetching | InsForge TypeScript SDK (client, RLS aktif) + Edge Function untuk agregasi analitik | Auto-generated API dari schema, tidak perlu bikin REST API manual |
| Import Excel/CSV | SheetJS (`xlsx`) + `papaparse` | Parsing file dilakukan di browser, gratis, tanpa perlu backend tambahan |

Alur data secara garis besar:

```
Browser (Next.js) → InsForge SDK (auth + query, RLS aktif) → Postgres
                  ↳ Edge Function `dashboard-stats` untuk agregasi analitik (satu panggilan, banyak metrik)
```

Tidak perlu backend server custom terpisah — InsForge menghandle auth, database, storage, sampai hosting frontend-nya; Next.js cukup fokus di presentation layer. Ini yang membuat arsitekturnya tetap murah dan simpel untuk di-maintain sendirian, dan konsisten dengan preferensi kamu untuk pakai satu platform saja.

Catatan keamanan: seperti platform BaaS sejenis, InsForge biasanya membedakan **public/anon key** (aman dipakai di client, dibatasi RLS) dan **service/secret key** (khusus server-side, bisa bypass RLS). Pastikan hanya public key yang pernah masuk ke bundle client — cek dokumentasi key InsForge saat setup project.

## 8. Skema Database

Diagram ER sudah ditampilkan di chat (3 tabel: `auth.users` bawaan InsForge, `job_applications`, `application_status_history`). Berikut DDL lengkapnya — perhatikan bahwa fungsi yang dipakai di RLS policy adalah **`uid()`**, bukan `auth.uid()` seperti di Supabase (InsForge punya konvensi fungsi sendiri untuk membaca JWT claims):

```sql
-- Ekstensi untuk fuzzy search (deteksi duplikat)
create extension if not exists "pg_trgm";

-- Tabel sumber lamaran (dikelola sendiri oleh user, bukan hardcode)
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.sources enable row level security;

create policy "user can manage own sources"
on public.sources for all
using (uid() = user_id)
with check (uid() = user_id);

-- Auto-seed sumber default saat user baru mendaftar
create or replace function seed_default_sources() returns trigger as $$
begin
  insert into public.sources (user_id, name) values
    (new.id, 'LinkedIn'),
    (new.id, 'JobStreet'),
    (new.id, 'Glints'),
    (new.id, 'Indeed'),
    (new.id, 'Website Perusahaan'),
    (new.id, 'Referral');
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_seed_default_sources
after insert on auth.users
for each row execute function seed_default_sources();

-- Tabel utama: lamaran kerja
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  role_title text not null,
  source_id uuid not null references public.sources(id) on delete restrict,
  job_url text,
  job_description text,
  location text,
  employment_type text check (employment_type in (
    'Full-time','Contract','Internship','Part-time'
  )),
  work_arrangement text check (work_arrangement in ('Remote','Hybrid','Onsite')),
  salary_min numeric,
  salary_max numeric,
  applied_date date not null default current_date,
  current_status text not null default 'Applied' check (current_status in (
    'Applied','Screening','HR Interview','Technical Interview',
    'Offer','Accepted','Rejected','Withdrawn','Ghosted'
  )),
  contact_person text,
  notes text,
  next_follow_up_date date,
  interview_scheduled_at timestamptz,
  offer_salary numeric,
  offer_deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_job_applications_user on public.job_applications(user_id);
create index idx_job_applications_company_trgm
  on public.job_applications using gin (company_name gin_trgm_ops);
create index idx_job_applications_status on public.job_applications(current_status);
create index idx_job_applications_applied_date on public.job_applications(applied_date desc);
create index idx_job_applications_source on public.job_applications(source_id);

-- Tabel riwayat perubahan status (progression tracking)
create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  status text not null,
  note text,
  changed_at timestamptz not null default now()
);

create index idx_status_history_app on public.application_status_history(application_id);

-- Trigger: otomatis catat riwayat setiap kali current_status berubah
create or replace function log_status_change() returns trigger as $$
begin
  if (tg_op = 'INSERT') or (old.current_status is distinct from new.current_status) then
    insert into public.application_status_history(application_id, status)
    values (new.id, new.current_status);
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_log_status_change
before insert or update on public.job_applications
for each row execute function log_status_change();

-- Row Level Security: user hanya bisa akses datanya sendiri
alter table public.job_applications enable row level security;
alter table public.application_status_history enable row level security;

create policy "user can manage own applications"
on public.job_applications for all
using (uid() = user_id)
with check (uid() = user_id);

create policy "user can view own status history"
on public.application_status_history for all
using (
  exists (
    select 1 from public.job_applications ja
    where ja.id = application_id and ja.user_id = uid()
  )
);
```

Query contoh untuk deteksi duplikat (dipanggil sebelum submit form tambah lamaran):

```sql
select id, company_name, role_title, applied_date, current_status,
       similarity(company_name, 'nama_perusahaan_input_user') as score
from job_applications
where user_id = uid()
  and similarity(company_name, 'nama_perusahaan_input_user') > 0.4
order by score desc
limit 5;
```

### 8.1 Query Analitik (dipanggil dari Edge Function `dashboard-stats`)

Digabung jadi satu pemanggilan untuk efisiensi (lihat 5.10):

```sql
-- Growth: jumlah lamaran per minggu, 8 minggu terakhir
select date_trunc('week', applied_date) as week, count(*) as total
from job_applications
where user_id = uid() and applied_date >= current_date - interval '8 weeks'
group by week order by week;

-- Success rate per tahap: lamaran yang PERNAH mencapai tiap status
select ash.status, count(distinct ash.application_id) as reached
from application_status_history ash
join job_applications ja on ja.id = ash.application_id
where ja.user_id = uid()
group by ash.status;

-- Distribusi sumber
select s.name, count(*) as total
from job_applications ja
join sources s on s.id = ja.source_id
where ja.user_id = uid()
group by s.name;

-- Tanggal unik untuk hitung streak & counter harian (dihitung di kode Edge Function)
select distinct applied_date
from job_applications
where user_id = uid()
order by applied_date desc
limit 90;
```

Keempat query di atas dijalankan dalam satu eksekusi Edge Function dan hasilnya digabung jadi satu JSON response — bukan 4 request terpisah dari browser.

## 9. Desain UI

### 9.0 Sistem Desain (Design Tokens)

Prinsip: bright & modern, tanpa dark mode (single theme tetap), tidak pakai kombinasi cream+serif+terracotta atau navy/dark yang generic-AI-looking.

**Warna inti:**

| Token | Hex | Peran |
|---|---|---|
| Trailblaze | `#FF7A33` | Primary/brand — tombol utama, CTA, streak |
| Moss | `#1F7A5C` | Success — status Offer/Accepted |
| Denim | `#2E6E8E` | Info — status Applied/Screening (biru muted, bukan navy) |
| Ember | `#D14343` | Danger — status Rejected |
| Paper | `#F7F6F3` | Background utama |
| Ink | `#201E1B` | Teks utama |
| Stone | `#8B887F` | Teks sekunder/muted, border |

**Tipografi** (dimuat via `next/font/google`, gratis & self-hosted otomatis oleh Next.js):

- **Unbounded** — display, untuk judul halaman & angka besar (streak count).
- **Plus Jakarta Sans** — body/UI, label, tombol, isi card.
- **IBM Plex Mono** — angka tabular: stat card, chart, kolom angka di tabel/list.

**Layout**: mobile-first. Desain dan komponen dibangun dulu untuk viewport mobile (~375-430px), baru di-scale up ke tablet/desktop lewat breakpoint Tailwind (`md:`, `lg:`) — bukan sebaliknya. Navigasi jadi bottom tab bar di mobile, berubah jadi sidebar kiri di desktop (≥768px).

**Elemen signature**: "streak trail" — baris titik-titik kecil (representasi 7 hari terakhir), terisi warna Trailblaze untuk hari yang ada lamarannya, kosong/outline untuk hari kosong, disertai ikon api dan angka streak. Ini elemen visual unik yang jadi ciri khas aplikasi, muncul di bagian atas Dashboard.

### 9.1 Struktur Navigasi (Menu)

4 menu (bottom tab bar di mobile, sidebar di desktop):

1. **Dashboard** — halaman utama (landing page setelah login): daftar lamaran + info actionable harian.
2. **Statistik** — halaman analitik terpisah (growth, success rate, distribusi sumber) — dipisah dari Dashboard supaya tidak ambigu/duplikat (lihat 5.10).
3. **Sumber Lamaran** — halaman pengaturan untuk CRUD sumber (lihat 5.7).
4. **Akun** — profil singkat + logout.

Aksi "Tambah Lamaran" dan "Import Excel" tidak jadi menu terpisah, cukup tombol di dalam halaman Dashboard.

### 9.2 Isi Dashboard

Dari atas ke bawah (mobile-first):

1. **Header** — judul halaman + tombol ikon "Tambah Lamaran" dan "Import Excel".
2. **Streak trail** — ikon api + angka streak + baris titik hari, plus counter harian ("Hari ini: 2 lamaran").
3. **2 kartu ringkasan** — Total Lamaran, Perlu Ditindaklanjuti (lihat 5.6 — sengaja hanya 2, metrik analitik lain ada di Statistik).
4. **Search + filter bar** — search box (perusahaan/role) dan filter status & sumber (di mobile: ikon filter membuka bottom sheet, bukan dropdown penuh yang makan tempat).
5. **List lamaran** — di mobile berbentuk **card list** (bukan tabel — tabel lebar tidak cocok di layar sempit), tiap card: nama perusahaan, role, badge status, tanggal + sumber, tap untuk buka detail. Di breakpoint desktop, list ini berubah jadi tabel penuh (lihat kolom di 5.5).
6. **Pagination**/infinite scroll di bagian bawah.

Wireframe kasar (mobile):

```
┌─────────────────────────┐
│ Lamaranku            [+]│
├─────────────────────────┤
│ 🔥 5 hari streak         │
│ ●●●●●○○  Hari ini: 2     │
├─────────────────────────┤
│ [Total: 24] [Perlu: 3]   │
├─────────────────────────┤
│ 🔍 Cari...          [⚙] │
├─────────────────────────┤
│ Gojek — Frontend Eng.    │
│ Interview · 28 Jul       │
├─────────────────────────┤
│ Traveloka — PM           │
│ Applied · 25 Jul         │
├─────────────────────────┤
│ 🏠 📊 🏷️ 👤              │
└─────────────────────────┘
```

### 9.3 Isi Halaman Statistik

1. **Header** — judul "Statistik".
2. **Applications Growth** — line chart, jumlah lamaran per minggu (8-12 minggu terakhir).
3. **Success rate per tahap** — bar chart horizontal, persentase lamaran yang pernah mencapai tiap status.
4. **Distribusi sumber** — donut chart, proporsi lamaran per sumber lamaran.

### 9.4 Tampilan yang Sudah Didemokan

Beberapa mockup struktural (sebelum update palet warna & mobile-first ini) sudah ditampilkan langsung di chat: layout dashboard + sidebar, tampilan detail lamaran dengan timeline riwayat status, dan tabel dengan kolom link sumber & aksi. Struktur/informasinya tetap berlaku, hanya styling visualnya yang perlu disesuaikan ke design token di 9.0 dan layout mobile-first di 9.2/9.3 saat implementasi — bisa didemokan ulang dengan tampilan barunya kapan saja kalau mau lihat dulu sebelum coding.

Halaman/komponen lain yang perlu dibuat saat implementasi (belum di-mockup, tapi straightforward):

- **Halaman login** — input email untuk magic link, atau email+password.
- **Halaman manajemen sumber** — list sederhana sumber lamaran dengan tombol tambah/edit/hapus (lihat 5.7).
- **Layar bulk import** — upload file, preview hasil parsing dengan penanda baris duplikat, tombol konfirmasi import (lihat 5.8).
- **Empty state** — saat belum ada data sama sekali, ajak user tambah lamaran pertama.

## 10. Roadmap Pengembangan

**Phase 1 — MVP (fokus di sini dulu)**
1. Setup project InsForge (Postgres + Auth + RLS sesuai skema di atas) + setup design token (9.0) di Tailwind config.
2. Halaman login (magic link).
3. Manajemen sumber lamaran (CRUD sources) — perlu ada duluan karena lamaran bergantung padanya.
4. CRUD lamaran kerja (form tambah/edit, delete dengan konfirmasi, field kondisional interview/offer).
5. Dashboard mobile-first: streak trail + counter harian, 2 kartu ringkasan, search/filter, card list (mobile) / tabel (desktop).
6. Deteksi duplikat saat submit form.
7. Halaman/drawer detail lengkap (termasuk deskripsi job) + timeline riwayat status.
8. Halaman Statistik: Edge Function `dashboard-stats` + 3 chart (growth, success rate, distribusi sumber).
9. Bulk import via Excel/CSV dengan preview & deteksi duplikat batch.
10. Deploy ke InsForge Site Deployment.

**Phase 2 — Nice to have**
1. Reminder follow-up (highlight lamaran yang `next_follow_up_date`-nya sudah lewat/dekat).
2. Export data ke CSV.
3. Custom status (user bisa tambah status sendiri selain default).
4. Notifikasi (email) untuk reminder follow-up.

## 11. Estimasi Biaya

| Komponen | Free tier InsForge | Cukup untuk kebutuhan ini? |
|---|---|---|
| Database | 500MB Postgres | Ya, sangat longgar untuk data single-user |
| Auth | 50.000 monthly active users | Jauh melebihi kebutuhan (1 user) |
| Bandwidth | 5GB/bulan | Cukup, apalagi dengan pendekatan query efisien di 5.10/6 |
| Storage | 1GB | Belum dipakai di MVP (tidak ada upload file) |
| Hosting frontend | Termasuk (Site Deployment) | Menggantikan kebutuhan Vercel terpisah |

**Estimasi biaya bulanan: $0**, selama tetap dalam batas single-user personal use.

⚠️ **Catatan penting**: proyek di free tier InsForge akan **di-pause otomatis kalau tidak diakses selama 1 minggu**. Untuk personal tool yang mungkin tidak dibuka tiap hari, ini berarti sesekali perlu resume manual dari dashboard InsForge sebelum bisa dipakai lagi. Kalau ini terasa mengganggu, alternatifnya: buka app minimal seminggu sekali (cukup untuk keep-alive), atau upgrade ke paid tier kalau nanti butuh uptime yang selalu siap.

## 12. Next Steps

Setelah PRD ini disetujui, langkah implementasi:

1. Setup InsForge project + jalankan DDL di bagian 8 (perhatikan `uid()`, bukan `auth.uid()`).
2. Scaffold Next.js project + integrasi InsForge Auth + setup design token (9.0) di Tailwind config.
3. Bangun komponen list (card mobile / TanStack Table desktop) mengikuti mockup & wireframe di bagian 9.
4. Bangun form CRUD + logic deteksi duplikat.
5. Bangun Edge Function `dashboard-stats` + halaman Statistik.
6. Deploy lewat InsForge Site Deployment.

Dokumen ini bisa jadi acuan saat mulai coding — kalau mau, bisa lanjut ke tahap scaffold project Next.js + InsForge-nya kapan saja.

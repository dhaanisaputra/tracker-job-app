-- Run this in the InsForge SQL editor for the project:
-- https://5fr37au2.ap-southeast.insforge.app

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

-- Deteksi duplikat: fuzzy match nama perusahaan (dipanggil dari browser via rpc)
create or replace function search_duplicates(p_company text)
returns table (
  id uuid,
  company_name text,
  role_title text,
  applied_date date,
  current_status text,
  score real
)
language sql stable security definer as $$
  select ja.id, ja.company_name, ja.role_title, ja.applied_date, ja.current_status,
         similarity(ja.company_name, p_company) as score
  from public.job_applications ja
  where ja.user_id = uid()
    and similarity(ja.company_name, p_company) > 0.4
  order by score desc
  limit 5;
$$;
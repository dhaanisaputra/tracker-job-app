-- Run this in the InsForge SQL editor for the project:
-- https://5fr37au2.ap-southeast.insforge.app

-- Profil user (dikelola sendiri, single-user). Phone column ada tapi belum dipakai UI.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  target_role text,
  linkedin_url text,
  portfolio_url text,
  salary_expectation numeric,
  phone text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "user can manage own profile"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- Auto-seed profil kosong saat user baru mendaftar
create or replace function seed_default_profile() returns trigger as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_seed_default_profile
after insert on auth.users
for each row execute function seed_default_profile();

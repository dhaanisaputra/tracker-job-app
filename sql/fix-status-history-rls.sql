-- Fix: RLS violation on application_status_history when inserting a job application
--
-- Root cause 1: trg_log_status_change ran BEFORE the parent row was inserted, so the
-- history RLS policy's `EXISTS(SELECT 1 FROM job_applications ...)` check saw no parent
-- row and rejected the history insert.
--
-- Root cause 2: job_applications.user_id had no DEFAULT and app inserts did not send it,
-- so the parent insert's with_check `auth.uid() = user_id` rejected it.
--
-- Fix: BEFORE trigger only touches updated_at; history insert is deferred to an AFTER
-- trigger (parent row exists). Add DEFAULT auth.uid() for user_id.

create or replace function public.touch_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.log_status_change() returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') or (old.current_status is distinct from new.current_status) then
    insert into public.application_status_history(application_id, status)
    values (new.id, new.current_status);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_status_change on public.job_applications;
drop trigger if exists trg_touch_updated_at on public.job_applications;

create trigger trg_touch_updated_at
before insert or update on public.job_applications
for each row execute function public.touch_updated_at();

create trigger trg_log_status_change
after insert or update on public.job_applications
for each row execute function public.log_status_change();

alter table public.job_applications alter column user_id set default auth.uid();
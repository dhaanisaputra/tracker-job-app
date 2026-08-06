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
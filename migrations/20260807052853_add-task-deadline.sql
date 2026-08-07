alter table public.job_applications
  add column if not exists task_deadline timestamptz;

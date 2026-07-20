-- apply alter tables
alter table public.users add column if not exists temp_password text;

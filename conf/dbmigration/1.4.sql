-- apply alter tables
alter table public.users rename column temp_password to hashed_password;

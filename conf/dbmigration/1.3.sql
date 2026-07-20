-- apply alter tables
alter table public.users add column if not exists auth_token text;

create unique index if not exists ux_users_auth_token_not_null
    on public.users (auth_token)
    where auth_token is not null;

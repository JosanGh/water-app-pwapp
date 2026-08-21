-- PureLedger database bootstrap
-- Run this file in Supabase SQL Editor before starting the app.

create table if not exists public.pureledger_store (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pureledger_store_id_check check (id = 'main_data'),
  constraint pureledger_store_data_check check (jsonb_typeof(data) = 'object')
);

create index if not exists pureledger_store_updated_at_idx
  on public.pureledger_store (updated_at desc);

create or replace function public.set_pureledger_store_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists pureledger_store_updated_at on public.pureledger_store;
create trigger pureledger_store_updated_at
before update on public.pureledger_store
for each row execute function public.set_pureledger_store_updated_at();

alter table public.pureledger_store enable row level security;

drop policy if exists "PureLedger can read its state" on public.pureledger_store;
create policy "PureLedger can read its state"
on public.pureledger_store
for select
to anon, authenticated
using (id = 'main_data');

drop policy if exists "PureLedger can create its state" on public.pureledger_store;
create policy "PureLedger can create its state"
on public.pureledger_store
for insert
to anon, authenticated
with check (id = 'main_data');

drop policy if exists "PureLedger can update its state" on public.pureledger_store;
create policy "PureLedger can update its state"
on public.pureledger_store
for update
to anon, authenticated
using (id = 'main_data')
with check (id = 'main_data');

grant select, insert, update on public.pureledger_store to anon, authenticated;

insert into public.pureledger_store (id, data)
values ('main_data', '{}'::jsonb)
on conflict (id) do nothing;
create table public.players (
  id uuid primary key,
  name text not null default '',
  avatar_url text,
  level integer not null default 1,
  trophies integer not null default 0,
  room jsonb not null default '[]'::jsonb,
  save jsonb not null default '{}'::jsonb,
  total_quota bigint not null default 0,
  updated_at timestamptz not null default now()
);

grant select on public.players to anon;
grant select, insert, update, delete on public.players to authenticated;
grant all on public.players to service_role;

alter table public.players enable row level security;

create policy "Players are publicly readable"
  on public.players for select to anon, authenticated using (true);
create policy "Users insert their own player row"
  on public.players for insert to authenticated with check (auth.uid() = id);
create policy "Users update their own player row"
  on public.players for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users delete their own player row"
  on public.players for delete to authenticated using (auth.uid() = id);

create table public.daily_quota (
  day text primary key,
  target bigint not null default 500,
  progress bigint not null default 0,
  completed boolean not null default false
);

grant select on public.daily_quota to anon;
grant select on public.daily_quota to authenticated;
grant all on public.daily_quota to service_role;

alter table public.daily_quota enable row level security;

create policy "Daily quota is publicly readable"
  on public.daily_quota for select to anon, authenticated using (true);

create table public.room_containers (
  id text primary key,
  owner_id uuid not null,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.room_containers to authenticated;
grant all on public.room_containers to service_role;

alter table public.room_containers enable row level security;

create policy "Owners manage their containers"
  on public.room_containers for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.hourly_scrap_claims (
  hour bigint not null,
  ordinal integer not null,
  claimed_by uuid,
  claimed_at timestamptz not null default now(),
  primary key (hour, ordinal)
);

grant select on public.hourly_scrap_claims to anon;
grant select on public.hourly_scrap_claims to authenticated;
grant all on public.hourly_scrap_claims to service_role;

alter table public.hourly_scrap_claims enable row level security;

create policy "Claims are publicly readable"
  on public.hourly_scrap_claims for select to anon, authenticated using (true);

create or replace function public.get_today_quota()
returns public.daily_quota
language plpgsql
security definer
set search_path = public
as $$
declare
  d text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  row public.daily_quota;
begin
  insert into public.daily_quota (day, target)
  values (d, 500 + 100 * (select count(*) from public.players))
  on conflict (day) do nothing;
  select * into row from public.daily_quota where day = d;
  return row;
end;
$$;

create or replace function public.deposit_scrap(amount integer)
returns public.daily_quota
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.daily_quota;
begin
  if amount is null or amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  perform public.get_today_quota();
  update public.daily_quota
  set progress = progress + amount,
      completed = completed or (progress + amount >= target)
  where day = to_char(now() at time zone 'utc', 'YYYY-MM-DD')
  returning * into row;
  if auth.uid() is not null then
    update public.players set total_quota = total_quota + amount where id = auth.uid();
  end if;
  return row;
end;
$$;

create or replace function public.claim_hourly_scrap(requested_hour bigint, requested_ordinal integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hourly_scrap_claims (hour, ordinal, claimed_by)
  values (requested_hour, requested_ordinal, auth.uid())
  on conflict (hour, ordinal) do nothing;
  return found;
end;
$$;

alter publication supabase_realtime add table public.daily_quota;
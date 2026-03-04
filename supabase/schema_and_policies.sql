-- PickleFast Supabase Schema + RLS + RPC
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- =========================
-- Core Tables
-- =========================

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create table if not exists public.league_invites (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  email text not null,
  invited_by_user_id uuid not null references auth.users(id) on delete restrict,
  invite_code text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz null,
  created_at timestamptz not null default now()
);

create unique index if not exists league_invites_unique_open
  on public.league_invites (league_id, lower(email))
  where accepted_at is null;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  elo_rating integer not null default 1000,
  created_at timestamptz not null default now()
);

create index if not exists players_league_idx on public.players(league_id);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  mode text not null check (mode in ('singles', 'doubles')),
  winner_side smallint not null check (winner_side in (1, 2)),
  score_optional jsonb null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  superseded_by_match_id uuid null references public.matches(id) on delete set null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists matches_league_idx on public.matches(league_id, created_at);

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  side smallint not null check (side in (1, 2)),
  created_at timestamptz not null default now()
);

create index if not exists match_participants_match_idx on public.match_participants(match_id);
create index if not exists match_participants_player_idx on public.match_participants(player_id);
create unique index if not exists match_participants_unique_per_match
  on public.match_participants(match_id, player_id);

create table if not exists public.rating_events (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  rating_before integer not null,
  rating_after integer not null,
  delta integer not null,
  created_at timestamptz not null default now()
);

create index if not exists rating_events_league_idx on public.rating_events(league_id, created_at);
create index if not exists rating_events_player_idx on public.rating_events(player_id, created_at);

-- =========================
-- Helper Functions
-- =========================

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_active_member(p_league_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = p_league_id
      and lm.user_id = p_user_id
      and lm.status = 'active'
  );
$$;

-- Auto-add creator as active member when league is created.
create or replace function public.handle_new_league_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.league_members (league_id, user_id, status)
  values (new.id, new.created_by_user_id, 'active')
  on conflict (league_id, user_id) do update set status = 'active';

  return new;
end;
$$;

drop trigger if exists trg_league_creator_membership on public.leagues;
create trigger trg_league_creator_membership
after insert on public.leagues
for each row
execute function public.handle_new_league_member();

-- =========================
-- Rating Recompute (team-average doubles)
-- =========================

create or replace function public.recompute_league_ratings(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k_factor numeric := 24;
  m record;
  team1_ids uuid[];
  team2_ids uuid[];
  p_id uuid;
  team1_rating numeric;
  team2_rating numeric;
  expected1 numeric;
  actual1 numeric;
  delta1 integer;
  delta2 integer;
  before_rating integer;
begin
  if not public.is_active_member(p_league_id) then
    raise exception 'Not authorized for this league';
  end if;

  update public.players
  set elo_rating = 1000
  where league_id = p_league_id;

  delete from public.rating_events
  where league_id = p_league_id;

  for m in
    select *
    from public.matches
    where league_id = p_league_id
      and is_deleted = false
      and superseded_by_match_id is null
    order by created_at asc, id asc
  loop
    select array_agg(mp.player_id order by mp.created_at, mp.id)
      into team1_ids
    from public.match_participants mp
    where mp.match_id = m.id and mp.side = 1;

    select array_agg(mp.player_id order by mp.created_at, mp.id)
      into team2_ids
    from public.match_participants mp
    where mp.match_id = m.id and mp.side = 2;

    if coalesce(array_length(team1_ids, 1), 0) = 0 or coalesce(array_length(team2_ids, 1), 0) = 0 then
      continue;
    end if;

    if m.mode = 'singles' and (array_length(team1_ids, 1) <> 1 or array_length(team2_ids, 1) <> 1) then
      raise exception 'Invalid singles participants for match %', m.id;
    end if;

    if m.mode = 'doubles' and (array_length(team1_ids, 1) <> 2 or array_length(team2_ids, 1) <> 2) then
      raise exception 'Invalid doubles participants for match %', m.id;
    end if;

    select avg(p.elo_rating)::numeric into team1_rating
    from public.players p
    where p.id = any(team1_ids);

    select avg(p.elo_rating)::numeric into team2_rating
    from public.players p
    where p.id = any(team2_ids);

    expected1 := 1 / (1 + power(10, ((team2_rating - team1_rating) / 400.0)));
    actual1 := case when m.winner_side = 1 then 1 else 0 end;
    delta1 := round(k_factor * (actual1 - expected1));
    delta2 := -delta1;

    foreach p_id in array team1_ids
    loop
      select p.elo_rating into before_rating
      from public.players p where p.id = p_id
      for update;

      update public.players
      set elo_rating = before_rating + delta1
      where id = p_id;

      insert into public.rating_events (league_id, match_id, player_id, rating_before, rating_after, delta)
      values (p_league_id, m.id, p_id, before_rating, before_rating + delta1, delta1);
    end loop;

    foreach p_id in array team2_ids
    loop
      select p.elo_rating into before_rating
      from public.players p where p.id = p_id
      for update;

      update public.players
      set elo_rating = before_rating + delta2
      where id = p_id;

      insert into public.rating_events (league_id, match_id, player_id, rating_before, rating_after, delta)
      values (p_league_id, m.id, p_id, before_rating, before_rating + delta2, delta2);
    end loop;
  end loop;
end;
$$;

-- =========================
-- RPC Functions
-- =========================

create or replace function public.invite_member(p_league_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_id uuid;
  v_email text := lower(trim(p_email));
begin
  if not public.is_active_member(p_league_id) then
    raise exception 'Not authorized for this league';
  end if;

  if v_email = '' then
    raise exception 'Email is required';
  end if;

  insert into public.league_invites (league_id, email, invited_by_user_id, invite_code)
  values (p_league_id, v_email, auth.uid(), replace(gen_random_uuid()::text, '-', ''))
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

create or replace function public.accept_league_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.league_invites%rowtype;
begin
  select *
    into v_invite
  from public.league_invites
  where invite_code = p_invite_code
  limit 1;

  if v_invite.id is null then
    raise exception 'Invite not found';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'Invite already accepted';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  if public.current_user_email() <> lower(v_invite.email) then
    raise exception 'Invite email does not match current user';
  end if;

  insert into public.league_members (league_id, user_id, status)
  values (v_invite.league_id, auth.uid(), 'active')
  on conflict (league_id, user_id) do update set status = 'active';

  update public.league_invites
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.league_id;
end;
$$;

create or replace function public.record_match(
  p_league_id uuid,
  p_mode text,
  p_team1 uuid[],
  p_team2 uuid[],
  p_winner_side smallint,
  p_score_optional jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
begin
  if not public.is_active_member(p_league_id) then
    raise exception 'Not authorized for this league';
  end if;

  if p_mode not in ('singles', 'doubles') then
    raise exception 'Invalid mode';
  end if;

  if p_winner_side not in (1, 2) then
    raise exception 'Invalid winner side';
  end if;

  if p_mode = 'singles' and (coalesce(array_length(p_team1, 1), 0) <> 1 or coalesce(array_length(p_team2, 1), 0) <> 1) then
    raise exception 'Singles requires 1 player per side';
  end if;

  if p_mode = 'doubles' and (coalesce(array_length(p_team1, 1), 0) <> 2 or coalesce(array_length(p_team2, 1), 0) <> 2) then
    raise exception 'Doubles requires 2 players per side';
  end if;

  if exists (
    select 1
    from (
      select unnest(p_team1 || p_team2) as pid
    ) x
    group by pid
    having count(*) > 1
  ) then
    raise exception 'Players must be unique in a match';
  end if;

  if (
    select count(*)
    from public.players p
    where p.league_id = p_league_id
      and p.id = any(p_team1 || p_team2)
  ) <> array_length(p_team1 || p_team2, 1) then
    raise exception 'One or more players do not belong to this league';
  end if;

  insert into public.matches (league_id, mode, winner_side, score_optional, created_by_user_id)
  values (p_league_id, p_mode, p_winner_side, p_score_optional, auth.uid())
  returning id into v_match_id;

  insert into public.match_participants (match_id, player_id, side)
  select v_match_id, unnest(p_team1), 1
  union all
  select v_match_id, unnest(p_team2), 2;

  perform public.recompute_league_ratings(p_league_id);

  return v_match_id;
end;
$$;

create or replace function public.edit_match(
  p_match_id uuid,
  p_mode text,
  p_team1 uuid[],
  p_team2 uuid[],
  p_winner_side smallint,
  p_score_optional jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
begin
  select m.league_id into v_league_id
  from public.matches m
  where m.id = p_match_id;

  if v_league_id is null then
    raise exception 'Match not found';
  end if;

  if not public.is_active_member(v_league_id) then
    raise exception 'Not authorized for this league';
  end if;

  if p_mode not in ('singles', 'doubles') then
    raise exception 'Invalid mode';
  end if;

  if p_winner_side not in (1, 2) then
    raise exception 'Invalid winner side';
  end if;

  if p_mode = 'singles' and (coalesce(array_length(p_team1, 1), 0) <> 1 or coalesce(array_length(p_team2, 1), 0) <> 1) then
    raise exception 'Singles requires 1 player per side';
  end if;

  if p_mode = 'doubles' and (coalesce(array_length(p_team1, 1), 0) <> 2 or coalesce(array_length(p_team2, 1), 0) <> 2) then
    raise exception 'Doubles requires 2 players per side';
  end if;

  if exists (
    select 1
    from (
      select unnest(p_team1 || p_team2) as pid
    ) x
    group by pid
    having count(*) > 1
  ) then
    raise exception 'Players must be unique in a match';
  end if;

  if (
    select count(*)
    from public.players p
    where p.league_id = v_league_id
      and p.id = any(p_team1 || p_team2)
  ) <> array_length(p_team1 || p_team2, 1) then
    raise exception 'One or more players do not belong to this league';
  end if;

  update public.matches
  set mode = p_mode,
      winner_side = p_winner_side,
      score_optional = p_score_optional
  where id = p_match_id
    and is_deleted = false;

  delete from public.match_participants where match_id = p_match_id;

  insert into public.match_participants (match_id, player_id, side)
  select p_match_id, unnest(p_team1), 1
  union all
  select p_match_id, unnest(p_team2), 2;

  perform public.recompute_league_ratings(v_league_id);

  return p_match_id;
end;
$$;

create or replace function public.delete_match(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
begin
  select m.league_id into v_league_id
  from public.matches m
  where m.id = p_match_id;

  if v_league_id is null then
    raise exception 'Match not found';
  end if;

  if not public.is_active_member(v_league_id) then
    raise exception 'Not authorized for this league';
  end if;

  update public.matches
  set is_deleted = true
  where id = p_match_id;

  perform public.recompute_league_ratings(v_league_id);

  return p_match_id;
end;
$$;

-- =========================
-- RLS Policies
-- =========================

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.league_invites enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.rating_events enable row level security;

drop policy if exists leagues_select on public.leagues;
create policy leagues_select on public.leagues
for select to authenticated
using (
  public.is_active_member(id)
  or created_by_user_id = auth.uid()
);

drop policy if exists leagues_insert on public.leagues;
create policy leagues_insert on public.leagues
for insert to authenticated
with check (created_by_user_id = auth.uid());

drop policy if exists leagues_update on public.leagues;
create policy leagues_update on public.leagues
for update to authenticated
using (
  public.is_active_member(id)
  or created_by_user_id = auth.uid()
)
with check (
  public.is_active_member(id)
  or created_by_user_id = auth.uid()
);

drop policy if exists leagues_delete on public.leagues;
create policy leagues_delete on public.leagues
for delete to authenticated
using (
  public.is_active_member(id)
  or created_by_user_id = auth.uid()
);

drop policy if exists league_members_select on public.league_members;
create policy league_members_select on public.league_members
for select to authenticated
using (public.is_active_member(league_id));

drop policy if exists league_members_update on public.league_members;
create policy league_members_update on public.league_members
for update to authenticated
using (public.is_active_member(league_id))
with check (public.is_active_member(league_id));

drop policy if exists league_members_delete on public.league_members;
create policy league_members_delete on public.league_members
for delete to authenticated
using (public.is_active_member(league_id));

drop policy if exists league_invites_select on public.league_invites;
create policy league_invites_select on public.league_invites
for select to authenticated
using (
  public.is_active_member(league_id)
  or lower(email) = public.current_user_email()
);

drop policy if exists league_invites_insert on public.league_invites;
create policy league_invites_insert on public.league_invites
for insert to authenticated
with check (
  public.is_active_member(league_id)
  and invited_by_user_id = auth.uid()
);

drop policy if exists league_invites_update on public.league_invites;
create policy league_invites_update on public.league_invites
for update to authenticated
using (public.is_active_member(league_id))
with check (public.is_active_member(league_id));

drop policy if exists players_select on public.players;
create policy players_select on public.players
for select to authenticated
using (public.is_active_member(league_id));

drop policy if exists players_insert on public.players;
create policy players_insert on public.players
for insert to authenticated
with check (public.is_active_member(league_id));

drop policy if exists players_update on public.players;
create policy players_update on public.players
for update to authenticated
using (public.is_active_member(league_id))
with check (public.is_active_member(league_id));

drop policy if exists players_delete on public.players;
create policy players_delete on public.players
for delete to authenticated
using (public.is_active_member(league_id));

drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches
for select to authenticated
using (public.is_active_member(league_id));

drop policy if exists matches_insert on public.matches;
create policy matches_insert on public.matches
for insert to authenticated
with check (
  public.is_active_member(league_id)
  and created_by_user_id = auth.uid()
);

drop policy if exists matches_update on public.matches;
create policy matches_update on public.matches
for update to authenticated
using (public.is_active_member(league_id))
with check (public.is_active_member(league_id));

drop policy if exists matches_delete on public.matches;
create policy matches_delete on public.matches
for delete to authenticated
using (public.is_active_member(league_id));

drop policy if exists match_participants_select on public.match_participants;
create policy match_participants_select on public.match_participants
for select to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_participants.match_id
      and public.is_active_member(m.league_id)
  )
);

drop policy if exists match_participants_insert on public.match_participants;
create policy match_participants_insert on public.match_participants
for insert to authenticated
with check (
  exists (
    select 1
    from public.matches m
    where m.id = match_participants.match_id
      and public.is_active_member(m.league_id)
  )
);

drop policy if exists match_participants_update on public.match_participants;
create policy match_participants_update on public.match_participants
for update to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_participants.match_id
      and public.is_active_member(m.league_id)
  )
)
with check (
  exists (
    select 1
    from public.matches m
    where m.id = match_participants.match_id
      and public.is_active_member(m.league_id)
  )
);

drop policy if exists match_participants_delete on public.match_participants;
create policy match_participants_delete on public.match_participants
for delete to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_participants.match_id
      and public.is_active_member(m.league_id)
  )
);

drop policy if exists rating_events_select on public.rating_events;
create policy rating_events_select on public.rating_events
for select to authenticated
using (public.is_active_member(league_id));

drop policy if exists rating_events_insert on public.rating_events;
create policy rating_events_insert on public.rating_events
for insert to authenticated
with check (public.is_active_member(league_id));

drop policy if exists rating_events_update on public.rating_events;
create policy rating_events_update on public.rating_events
for update to authenticated
using (public.is_active_member(league_id))
with check (public.is_active_member(league_id));

drop policy if exists rating_events_delete on public.rating_events;
create policy rating_events_delete on public.rating_events
for delete to authenticated
using (public.is_active_member(league_id));

-- Grant execute on RPC helpers
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.leagues to authenticated;
grant select, insert, update, delete on table public.league_members to authenticated;
grant select, insert, update, delete on table public.league_invites to authenticated;
grant select, insert, update, delete on table public.players to authenticated;
grant select, insert, update, delete on table public.matches to authenticated;
grant select, insert, update, delete on table public.match_participants to authenticated;
grant select, insert, update, delete on table public.rating_events to authenticated;

grant execute on function public.recompute_league_ratings(uuid) to authenticated;
grant execute on function public.invite_member(uuid, text) to authenticated;
grant execute on function public.accept_league_invite(text) to authenticated;
grant execute on function public.record_match(uuid, text, uuid[], uuid[], smallint, jsonb) to authenticated;
grant execute on function public.edit_match(uuid, text, uuid[], uuid[], smallint, jsonb) to authenticated;
grant execute on function public.delete_match(uuid) to authenticated;


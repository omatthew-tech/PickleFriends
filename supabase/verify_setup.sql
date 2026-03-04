-- PickleFast Supabase verification queries
-- Run these in Supabase SQL Editor after schema_and_policies.sql succeeds.

-- 1) Confirm core tables exist
select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'leagues',
    'league_members',
    'league_invites',
    'players',
    'matches',
    'match_participants',
    'rating_events'
  )
order by tablename;

-- 2) Confirm RLS is enabled
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'leagues',
    'league_members',
    'league_invites',
    'players',
    'matches',
    'match_participants',
    'rating_events'
  )
order by tablename;

-- 3) Confirm functions exist
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'recompute_league_ratings',
    'invite_member',
    'accept_league_invite',
    'record_match',
    'edit_match',
    'delete_match'
  )
order by proname;


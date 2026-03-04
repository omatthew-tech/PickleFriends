-- Fix for error:
-- "function gen_random_bytes(integer) does not exist"
--
-- Run this in Supabase SQL Editor.

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


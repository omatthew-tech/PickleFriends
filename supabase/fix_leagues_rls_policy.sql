-- Fix for "new row violates row-level security policy for table leagues"
-- Run this in Supabase SQL Editor.

drop policy if exists leagues_select on public.leagues;
create policy leagues_select on public.leagues
for select to authenticated
using (
  public.is_active_member(id)
  or created_by_user_id = auth.uid()
);

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


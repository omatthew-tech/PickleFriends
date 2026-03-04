# Supabase Setup (Step by Step)

Use this guide to apply the PickleFast schema, RLS, and RPC functions.

## 1) Create Supabase project

1. Go to Supabase and create a new project.
2. Wait for the project to finish provisioning.
3. Open your project dashboard.

## 2) Get API keys for your web app

1. In Supabase, open `Project Settings` -> `API`.
2. Copy:
   - `Project URL`
   - `anon public` key
3. In your repo, create `app/.env` and add:

```bash
VITE_SUPABASE_URL=YOUR_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## 3) Run the database SQL

1. In Supabase, open `SQL Editor`.
2. Create a new query.
3. Paste the full contents of:
   - `supabase/schema_and_policies.sql`
4. Click `Run`.
5. Confirm you get success with no errors.
6. (Optional) Run `supabase/verify_setup.sql` to validate tables, RLS, and RPC function presence.

## 4) Configure Auth settings

1. Open `Authentication` -> `Providers` -> `Email`.
2. Enable email provider.
3. Enable both:
   - Email OTP (magic code)
   - Email + password
4. In `Authentication` -> `URL Configuration`, set:
   - Site URL (your local URL during dev): `http://localhost:5173`

## 5) Verify tables and policies

In SQL Editor, run:

```sql
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
```

Then verify RLS is enabled:

```sql
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
```

## 6) Start the app with Supabase env

From `app/`:

```bash
npm install
npm run dev
```

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, auth will use Supabase instead of local dev fallback.

## 7) Smoke test (recommended)

Use your app (signed in) for end-to-end verification:

1. Create a league.
2. Add players.
3. Record a singles match.
4. Confirm leaderboard updates.
5. Invite a member email.
6. Sign in as invited user and accept invite.

Then verify data in SQL Editor:

```sql
select id, name, created_by_user_id, created_at
from public.leagues
order by created_at desc
limit 5;
```

```sql
select league_id, user_id, status, created_at
from public.league_members
order by created_at desc
limit 20;
```

```sql
select league_id, mode, winner_side, is_deleted, created_at
from public.matches
order by created_at desc
limit 20;
```

## 8) RPC functions available for app integration

- `record_match(p_league_id, p_mode, p_team1, p_team2, p_winner_side, p_score_optional)`
- `edit_match(p_match_id, p_mode, p_team1, p_team2, p_winner_side, p_score_optional)`
- `delete_match(p_match_id)`
- `invite_member(p_league_id, p_email)`
- `accept_league_invite(p_invite_code)`
- `recompute_league_ratings(p_league_id)`

Use Supabase RPC from the frontend:

```ts
const { data, error } = await supabase.rpc('record_match', {
  p_league_id: leagueId,
  p_mode: 'singles',
  p_team1: [playerAId],
  p_team2: [playerBId],
  p_winner_side: 1,
  p_score_optional: { display: '11-8,11-9' },
})
```

## 9) Common issues

- `new row violates row-level security policy`: user is not an active league member.
- `Invite email does not match current user`: signed-in email must match invite email.
- `Invalid doubles participants`: doubles must be exactly 2 players per side.

### League creation RLS fix

If league creation fails with:
`new row violates row-level security policy for table "leagues"`

Run:
- `supabase/fix_leagues_rls_policy.sql`

This updates `leagues` policies so the creator can immediately read/update/delete their own newly created league row.

### Invite function fix

If you see:
`function gen_random_bytes(integer) does not exist`

Run:
- `supabase/fix_invite_function.sql`

This replaces invite code generation with `gen_random_uuid()`-based values for compatibility.


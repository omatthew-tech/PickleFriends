# PickleFast Technical Specification (Web-First, Mobile-Ready)

## 1) Architecture Recommendation

Use a web-first architecture now, with reusable domain logic for future mobile.

- App shell: `React + TypeScript + Vite`
- Routing: `React Router`
- Data fetching/cache: `TanStack Query`
- Backend/platform: `Supabase` (Postgres, Auth, RLS)
- Validation: `zod`
- Optional forms: `react-hook-form`

## 2) Why Web First Instead of React Native First

- Faster to launch and iterate for your current goal.
- Lower implementation complexity for authentication and browser flows.
- Still future-proof: isolate domain logic (ELO + match recommendations) into shared TS modules for later React Native reuse.

Recommended future mobile path:
- Option A: React Native app using shared packages from this repo.
- Option B: Expo + monorepo with shared `core` domain package.

## 3) Suggested Project Structure

```text
src/
  app/
    routes/
  features/
    bracket/
    leaderboard/
    matches/
    scoring/
    auth-save/
  domain/
    elo/
    matchmaking/
    models/
  lib/
    supabase/
    validation/
  ui/
    components/
    tokens/
```

## 4) Data Model (Supabase/Postgres)

## 4.1 Tables

### leagues
- `id` (uuid, pk)
- `name` (text, not null)
- `created_by_user_id` (uuid, references auth.users.id)
- `created_at` (timestamp)

### league_members
- `id` (uuid, pk)
- `league_id` (uuid, fk -> leagues.id)
- `user_id` (uuid, fk -> auth.users.id)
- `status` (text enum: `active` | `invited`)
- `created_at` (timestamp)

### league_invites
- `id` (uuid, pk)
- `league_id` (uuid, fk -> leagues.id)
- `email` (text, not null)
- `invited_by_user_id` (uuid, fk -> auth.users.id)
- `invite_code` (text, unique)
- `expires_at` (timestamp)
- `accepted_at` (timestamp, nullable)
- `created_at` (timestamp)

### players
- `id` (uuid, pk)
- `league_id` (uuid, fk -> leagues.id)
- `display_name` (text, not null)
- `elo_rating` (int, default 1000)
- `created_at` (timestamp)

### matches
- `id` (uuid, pk)
- `league_id` (uuid, fk)
- `mode` (text enum: `singles` | `doubles`)
- `winner_side` (smallint, 1 or 2)
- `score_optional` (jsonb, nullable)
- `created_by_user_id` (uuid, nullable for anonymous pre-save)
- `superseded_by_match_id` (uuid, nullable, fk -> matches.id)
- `is_deleted` (boolean, default false)
- `created_at` (timestamp)

### match_participants
- `id` (uuid, pk)
- `match_id` (uuid, fk -> matches.id)
- `player_id` (uuid, fk -> players.id)
- `side` (smallint, 1 or 2)

### rating_events
- `id` (uuid, pk)
- `league_id` (uuid, fk)
- `match_id` (uuid, fk)
- `player_id` (uuid, fk)
- `rating_before` (int)
- `rating_after` (int)
- `delta` (int)
- `created_at` (timestamp)

## 4.2 Notes

- Anonymous sessions can be local-only until user saves.
- On save, write all local entities to Supabase and attach to the authenticated creator member.
- Any active league member can invite player emails; accepted invites become active `league_members`.

## 5) ELO Rating Logic

## 5.1 Defaults

- Starting rating: `1000`
- K-factor:
  - default `24` (good for casual leagues)
  - optionally dynamic later (e.g., lower after many games)

## 5.2 Singles Update

For players A vs B:

- Expected score of A:  
  `EA = 1 / (1 + 10^((RB - RA)/400))`
- Actual score SA:
  - win = `1`
  - loss = `0`
- New rating:
  `RA' = RA + K * (SA - EA)`

Apply same formula for B (or opposite result).

## 5.3 Doubles Update

For team1 (A+C) vs team2 (B+D):

- Team ratings are average:
  - `R1 = (RA + RC) / 2`
  - `R2 = (RB + RD) / 2`
- Compute expected outcome by team average ELO.
- Compute team delta via ELO formula.
- Apply identical individual delta to both players on each side.

This uses team average only and preserves your requirement that doubles and singles contribute equivalently to each player's score.

## 5.4 Persistence Safety

- Score confirmation should be transactional:
  1. Insert match
  2. Insert participants
  3. Compute/commit rating updates
  4. Insert rating events
- Roll back all on failure.

## 6) Match Recommendation Logic

## 6.1 Singles

- Sort players by ELO.
- Build pairings minimizing adjacent ELO distance.
- Apply rematch exclusion window:
  - Small brackets: avoid opponents from last 1 game.
  - Larger brackets: avoid opponents from last 2 games.
- If constraints are too strict, gracefully relax from 2 -> 1 -> 0 game lookback.

## 6.2 Doubles

- Generate candidate team pairs from available players.
- Team skill = average team ELO.
- Score each candidate by absolute difference between team averages.
- Return lowest-difference combinations first.
- Apply same rematch exclusion logic using recent teammate/opponent combinations.

## 6.3 Practical Constraints

- If insufficient players:
  - Singles requires >=2
  - Doubles requires >=4
- For odd counts, show best complete set + leftover note.

## 7) Save-for-Next-Time Flow (Supabase)

1. User enters email.
2. User chooses auth method:
   - Email + password
   - Email OTP
3. App completes chosen method with Supabase Auth.
4. User submits league name.
5. App creates/links account and writes league data.

Implementation detail:
- Support both `signInWithPassword` and `signInWithOtp`.
- Use email verification for new signups in both methods.
- After auth, upsert `league_members` for creator and optional invited members.

## 7.1 Invite Player Emails (Single Role)

- Any active member adds player emails from league settings/members screen.
- System creates `league_invites` records and sends invite links or OTP-based join prompts.
- On acceptance, invited user is mapped to `league_members` as an active member.
- Single role model: all members have equal functionality (invite others, record/edit/delete scores, view recommendations, manage bracket players).

## 8) Security and Access

- Row Level Security (RLS) enabled on all user-owned tables.
- Policy: active `league_members` can read/write league gameplay entities (players, matches, participants, rating events).
- Policy: active `league_members` can also create invitations for their league.
- Validate all score submissions server-side (participant counts, unique players, valid winner side).

## 9) API Surface (if using server functions)

- `POST /record-match` -> validates payload, commits match + ratings transactionally
- `POST /edit-match` -> edits prior match and recomputes downstream ratings
- `POST /delete-match` -> soft-deletes prior match and recomputes downstream ratings
- `GET /leaderboard?leagueId=` -> returns ranked players
- `GET /recommended-matches?leagueId=&mode=` -> returns recommendations
- `POST /invite-member` -> active member invites player email to league
- `POST /accept-invite` -> invited user joins league

This can be implemented with Supabase RPC/Edge Functions instead of a separate server.

## 9.1 Editing and Deleting Match Scores

To preserve rating integrity, use one of these strategies:

- **Recommended:** event-sourced recompute
  - Keep immutable match history.
  - Mark deleted/edited versions via `is_deleted` and `superseded_by_match_id`.
  - Recompute ratings chronologically for all matches after the changed match.
- **Alternative:** hard update and full rebuild
  - Simpler DB shape, but less auditability.

Recommended UI behavior:
- `Edit Scores` page loads recent matches with edit/delete actions.
- Editing or deleting triggers recalculation job and returns updated leaderboard snapshot.

## 10) Testing Strategy

- Unit:
  - ELO formula correctness
  - Doubles rating deltas
  - Recommendation ranking
  - Rematch-exclusion lookback behavior (1 vs 2 games)
- Integration:
  - Score wizard end-to-end
  - Transaction rollback behavior
  - Edit/delete match recalculation correctness
  - Invite acceptance and member permissions
- UI:
  - Responsive behavior at each breakpoint
  - Accessibility keyboard navigation and focus states


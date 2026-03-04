# PickleFast

PickleFast is a web-first pickleball league app that lets friends create a bracket, track match results, and maintain an ELO-based leaderboard without requiring signup at the start.

This repository currently contains product and implementation documentation for Phase 1 (web app), with architecture choices designed to support a future mobile app.

## Web App (V1)

The V1 implementation is in `app/`.

Run locally:

1. `cd app`
2. `npm install`
3. `npm run dev`

## Documentation Index

- `docs/PRODUCT_SPEC.md` - Product requirements, user flows, and acceptance criteria
- `docs/TECHNICAL_SPEC.md` - Web architecture, data model, ELO logic, and Supabase integration
- `docs/DESIGN_SYSTEM.md` - Spacing, typography, breakpoints, layout, and color system
- `docs/SUPABASE_SETUP.md` - Exact Supabase setup steps (schema, RLS, RPC)

## Product Summary

- Users can create a bracket quickly with default players and add unlimited players.
- Leaderboard ranks all players by ELO score.
- Recommended Matches suggests fair pairings for singles or doubles based on skill similarity while avoiding last 1-2 games.
- Input Score flow captures participants, winner, optional game score, and confirmation.
- Edit Scores lets users edit or delete past matches and automatically recalculate leaderboard ratings.
- Save for Next Time allows league persistence using Supabase-backed email/password or email OTP auth.
- Any league member can invite player emails; all members share one role with full league functionality.

## Recommended Stack (Web First, Mobile Ready)

- Frontend: `React + TypeScript + Vite`
- Styling: `CSS variables` (tokenized design system), optional `Tailwind` mapping
- Backend: `Supabase` (Postgres, Auth, RLS, Edge Functions optional)
- State/query: `TanStack Query` + lightweight client state

## Why Not React Native First?

For your goals, the fastest path is:
1. Build a high-quality web app first.
2. Reuse domain logic and design tokens.
3. Move to mobile using `React Native` (ideally with shared TypeScript packages).

React Native is excellent for mobile, but it slows initial web delivery unless you introduce extra cross-platform tooling early. A web-first implementation can still preserve almost all business logic for later reuse.


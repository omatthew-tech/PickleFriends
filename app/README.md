# PickleFast Web App (V1)

Web-first V1 implementation for PickleFast using React + TypeScript + Vite.

## Implemented V1 Features

- Create bracket with default `Player 1` and `Player 2` plus unlimited add-player flow
- ELO leaderboard (team-average-only doubles logic)
- Recommended matches for singles/doubles with recent-rematch avoidance (last 1-2 games)
- Guided score entry flow (select participants -> pick winner + optional score -> confirm animation)
- Edit Scores page with edit and delete actions on past matches
- Save for Next Time flow with:
  - email verification code step
  - password or OTP method
  - member email invites
  - single shared role model (all members have full permissions)

## Design System Applied

- Fibonacci spacing tokens: `8, 13, 21, 34, 55, 89, 144, 233`
- Type scale: `13, 21, 34, 55, 89`
- Radius scale: `13, 21, 34, 55`
- 5 responsive breakpoints
- 2-column desktop behavior collapsing to single-column at `968px`
- Palette and subtle court-line background motif implemented in `src/index.css`

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Supabase Setup (Optional in Local V1)

Create `app/.env` from `.env.example`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

If Supabase env vars are not configured, save/auth uses local dev mode so the app remains fully demoable.


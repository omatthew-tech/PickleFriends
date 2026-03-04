# PickleFast Product Specification

## 1) Vision

PickleFast helps groups of friends run an informal pickleball league with minimal friction:
- No signup required to start.
- Fast bracket creation.
- Fair matchmaking through ELO.
- Simple score entry and transparent leaderboard updates.
- Optional persistence for future sessions.

## 2) Goals and Non-Goals

### Goals

- Let users create a playable bracket in under 60 seconds.
- Maintain a continuously updated ELO leaderboard.
- Recommend balanced matches for singles and doubles.
- Record scores in a guided flow with clear confirmation.
- Allow users to save a league for next time using email verification.

### Non-Goals (Phase 1)

- Tournament elimination brackets with advanced seeding rules.
- Public social profiles and global ranking.
- Payments, subscriptions, or ads.
- Native mobile app in Phase 1.

## 3) Target Users

- Casual friend groups who play regularly.
- Hosts organizing recurring local pickleball sessions.
- Competitive but lightweight leagues that want fair matches.

## 4) Core User Stories

- As a host, I can create a bracket instantly with default players so I can start quickly.
- As a host, I can add unlimited players and rename each one.
- As a player, I can see who is strongest on a live leaderboard.
- As a host, I can get recommended matchups for similarly skilled players.
- As a host, I can record who played and who won in a simple step-by-step flow.
- As a host, I can save league data to return later.

## 5) Primary User Flows

## 5.1 Create Bracket

1. User taps `Create Bracket`.
2. App opens Create Bracket page with two rounded player inputs prefilled:
   - `Player 1`
   - `Player 2`
3. User can edit names directly.
4. User taps `Add Player` to append additional rounded inputs:
   - `Player 3`, `Player 4`, etc. (default labels until renamed)
5. User can add as many players as needed.
6. User taps `Continue` to navigate to Leaderboard.

### Acceptance Criteria

- Two default player inputs are always present on load.
- Add Player appends one new editable player input each tap.
- Player list supports unlimited additions (practical UI virtualization if needed).
- Continue is disabled until at least 2 valid player names exist.

## 5.2 Leaderboard

The Leaderboard page displays:
- Ranked players by ELO (highest first)
- Current rating and movement indicator (optional for v1)
- Primary actions:
  - `Recommended Matches`
  - `Input Score`
  - `Edit Scores`
  - `Save for Next Time`

### Acceptance Criteria

- Rankings update immediately after score confirmation.
- Ties are handled deterministically (e.g., alphabetical secondary sort).
- `Edit Scores` opens a list of past matches with edit and delete controls.

## 5.3 Recommended Matches

1. User taps `Recommended Matches`.
2. App opens Recommended Matches page.
3. User toggles between:
   - `Singles`
   - `Doubles`
4. App shows suggested pairings from closest ELO levels.
5. User can accept a recommendation and proceed to score entry (optional v1 shortcut).

### Matchmaking Rules

- Singles mode: suggest player vs player.
- Doubles mode: suggest team vs team combinations with balanced average ELO.
- Result impact rule: singles wins and doubles wins both update each participating player ELO equivalently by system logic.
- Recommendations avoid players from their last 1-2 games (exact lookback chosen by bracket size).

### Acceptance Criteria

- Singles recommendations prioritize minimal ELO difference.
- Doubles recommendations prioritize team average ELO closeness.
- Toggle swaps recommendation mode instantly.
- Match suggestions avoid immediate rematches from recent history.

## 5.4 Input Score (Guided Flow)

### Step 1: Select Participants

- User taps `Input Score`.
- User selects players who played:
  - Singles: 2 players
  - Doubles: 4 players
- Tap `Next`.

### Step 2: Pick Winner and Optional Score

- Show only selected participants.
- User selects winner side (single player or doubles team).
- Show `Optional` section for entering numeric game score details.
- Tap `Next`.

### Step 3: Confirm

- Display full summary:
  - Participants
  - Winner
  - Optional score details
- User taps `Confirm`.
- Show success animation ending with green check and message:
  - `The score has been successfully recorded`
- Return to Leaderboard.

### Acceptance Criteria

- Cannot continue without valid participant count and winner selection.
- Confirmation updates leaderboard before returning.
- Success message and animation are visible and accessible.

## 5.5 Save for Next Time

1. User taps `Save for Next Time`.
2. User enters email.
3. System sends verification code.
4. User chooses sign-in method:
   - Password flow
   - Email OTP-only flow
5. If password flow is selected, user enters:
   - League name
   - Password
   - Confirm password
6. If OTP-only flow is selected, user verifies email code and enters league name.
7. System creates persistent league account and saves current league data.
8. Any league member can add player emails so invited players can access full league functionality.

### Acceptance Criteria

- Email verification is required before account creation.
- Password and confirm password must match and pass policy when password flow is selected.
- Existing league data is associated to the newly created account.
- Invited player emails can join the league and record scores with full permissions.
- League has a single role model: all members have the same permissions.

## 5.6 Edit Scores

1. User taps `Edit Scores` on Leaderboard.
2. App opens a list of past recorded matches in reverse chronological order.
3. Each score row has:
   - `Edit` icon
   - `Delete` icon
4. On `Edit`, user updates participants/winner/optional score fields and confirms.
5. On `Delete`, app asks for confirmation before removal.
6. Leaderboard recalculates and refreshes immediately after edit/delete.

### Acceptance Criteria

- Past matches are easy to scan and modify.
- Edit and delete are both available from the same history list.
- All affected ELO ratings are recalculated correctly after any edit or deletion.
- Destructive actions require explicit confirmation.

## 6) Functional Requirements

- Anonymous session start for all users.
- Bracket/player CRUD in session state.
- ELO computation on confirmed results.
- Recommended singles and doubles generation.
- Recommendations avoid last 1-2 games based on bracket size.
- Score-entry wizard with validation at each step.
- Past match editing and deletion with full leaderboard recalculation.
- Persistent save flow via Supabase Auth + DB.
- League retrieval by authenticated user.
- Any league member can invite player emails; invited players can add scores and use full league features.

## 7) Non-Functional Requirements

- Fast first input response (<100ms on core interactions).
- Mobile-responsive web UI from day one.
- Accessibility:
  - Keyboard support for web
  - Color contrast AA baseline
  - Focus-visible states on all interactive elements
- Data correctness and transactional score recording.

## 8) Analytics (Optional but Recommended)

- Bracket created
- Player added
- Recommended matches viewed
- Score confirmed
- Save flow started
- Save flow completed

## 9) Risks and Mitigations

- **Risk:** Recommendation quality feels random for small groups.  
  **Mitigation:** Use deterministic nearest-neighbor pairing with transparent logic.

- **Risk:** ELO confusion for casual users.  
  **Mitigation:** Add short tooltip: "Higher rating means stronger recent results."

- **Risk:** Abandonment at save flow.  
  **Mitigation:** Keep save optional and post-successful-use only.

## 10) Milestones

- M1: Bracket creation + leaderboard skeleton
- M2: ELO updates + input score flow
- M3: Recommendation engine (singles/doubles)
- M4: Save-for-next-time flow with Supabase
- M5: QA hardening, accessibility, launch


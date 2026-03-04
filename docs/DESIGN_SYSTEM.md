# PickleFast Design System (v1)

## 1) Brand Direction

PickleFast should feel:
- Competitive but friendly
- Clean and modern
- Fast to scan on mobile
- Pickleball-inspired without neon overload

## 2) Color Palette

- Background: `#F6F8FA` (cool off-white)
- Surface/Card: `#FFFFFF`
- Primary / Court Teal: `#0F766E`
- Secondary / Court Blue: `#1E40AF`
- Accent / Wiffle Lime: `#C8F902` (small doses)
- Text: `#0B1220`
- Divider: `#E5E7EB`

### Usage Guidance

- `Create Bracket` CTA uses Court Teal.
- `Recommended Matches` CTA uses Court Blue.
- Use Wiffle Lime only for tiny highlights (badges, active toggles, small rank chips).

## 3) Spacing System (Fibonacci, 8px base family)

Token set (px):
`8, 13, 21, 34, 55, 89, 144, 233`

Suggested naming:
- `--space-1: 8px`
- `--space-2: 13px`
- `--space-3: 21px`
- `--space-4: 34px`
- `--space-5: 55px`
- `--space-6: 89px`
- `--space-7: 144px`
- `--space-8: 233px`

## 4) Typography

Primary display font: `Oswald` (with safe fallback stack).

Type scale (px):
`13, 21, 34, 55, 89`

Recommended mapping:
- `--text-xs: 13px` (meta labels)
- `--text-sm: 21px` (body/inputs)
- `--text-md: 34px` (section headings)
- `--text-lg: 55px` (hero/primary page title)
- `--text-xl: 89px` (marketing only, rarely in-app)

## 5) Radius System

- Small: `13px`
- Medium: `21px`
- Large: `34px`
- Pill: `55px`

Usage:
- Player input chips/cards: medium to large.
- Primary buttons: large.
- Full pill controls/toggles: pill.

## 6) Responsive Breakpoints (5 total)

Use 5 breakpoints and scale tokens proportionally down on smaller screens:

- `xl`: >= 1440px
- `lg`: 1200px to 1439px
- `md`: 969px to 1199px
- `sm`: 600px to 968px
- `xs`: <= 599px

Layout rule:
- Desktop/tablet (`md` and above): 2-column grid where appropriate.
- At `968px` and below: collapse to single-column flex layout.

## 7) Layout Patterns

- Page container max width for readability (e.g., 1200px).
- Card-based sections on surface white over off-white background.
- Consistent vertical rhythm using spacing tokens only.
- Keep primary action in thumb-friendly zone on mobile.

## 8) Component Notes

### Player Input Rows
- Rounded rectangular fields with clear affordance for editing names.
- Default placeholders: `Player 1`, `Player 2`, etc.

### Buttons
- Primary (`Create Bracket`): teal filled.
- Secondary (`Recommended Matches`): blue filled.
- Tertiary: neutral or outlined.

### Leaderboard
- High-contrast rank and rating text.
- Optional lime accent chips for movement/trend.

### Toggle (Singles/Doubles)
- Clear active state, with accent highlight.
- Must be keyboard and touch friendly.

## 9) Background Court-Line Motif

Add subtle court-line pattern at `2% to 4%` opacity:
- Use thin geometric lines in neutral/teal tint.
- Keep contrast low so content remains primary.
- Pattern should never reduce text readability.

## 10) Example CSS Token Scaffold

```css
:root {
  /* Colors */
  --bg: #f6f8fa;
  --surface: #ffffff;
  --primary: #0f766e;
  --secondary: #1e40af;
  --accent: #c8f902;
  --text: #0b1220;
  --divider: #e5e7eb;

  /* Spacing */
  --space-1: 8px;
  --space-2: 13px;
  --space-3: 21px;
  --space-4: 34px;
  --space-5: 55px;
  --space-6: 89px;
  --space-7: 144px;
  --space-8: 233px;

  /* Type */
  --text-xs: 13px;
  --text-sm: 21px;
  --text-md: 34px;
  --text-lg: 55px;
  --text-xl: 89px;

  /* Radius */
  --radius-sm: 13px;
  --radius-md: 21px;
  --radius-lg: 34px;
  --radius-pill: 55px;
}
```


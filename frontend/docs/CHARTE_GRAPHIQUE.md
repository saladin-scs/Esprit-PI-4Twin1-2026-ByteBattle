# ByteBattle - Visual Style Guide

## Colors

| Role | Implementation |
|------|------------------|
| **Brand / accent** | `primary-*` (CTA, links, active tabs) + `sky-*` for opacity halos/gradients (visual equivalent required by `@apply` Tailwind) |
| **Text** | `slate-900` / `slate-100` (headings), `slate-600` / `slate-400` (body - `.bb-body-text` class) |
| **Surfaces** | `slate-50` light page background, `slate-950` dark page background |
| **Cards** | `.bb-card`, `.bb-card-interactive` |
| **States** | Brand success states: `primary-*`. Errors: `red-*`. Warning: `amber-*`. |

## Utility Classes (`src/index.css`, `@layer components` block)

Prefix **`bb-`**: use for contest lists, contest detail, and reusable blocks.

- `.bb-hero-gradient-tall` - top halo for contest list page  
- `.bb-hero-gradient-detail` - halo for contest detail page  
- `.bb-title-gradient` - main title brand gradient  
- `.bb-kicker` - section chip (e.g. "Contests")  
- `.bb-section-title` - section subtitles  
- `.bb-card` / `.bb-card-interactive` - cards  
- `.bb-tablist`, `.bb-tab-trigger-active` - contest tabs  
- `.bb-lb-aside`, `.bb-lb-pill-active` - contest leaderboard  

## Rules

1. Do not introduce `emerald-*`, `indigo-*`, or `violet-*` for product UI - use **`primary-*`** or **`bb-*`** classes.  
2. Primary buttons: `Button` (`primary` variant) = `primary-600`.  
3. Keyboard focus: `ring-primary-500`.

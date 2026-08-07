---
name: Lamaranku Admin
colors:
  surface: '#ffffff'
  surface-muted: '#f7f8fa'
  surface-sunken: '#f1f3f6'
  paper: '#eef1f5'
  ink: '#1b2030'
  stone: '#5b6478'
  line: '#e3e7ee'
  line-strong: '#cfd6e1'
  trailblaze: '#3a5cd9'
  trailblaze-soft: '#e9edfd'
  moss: '#19916c'
  denim: '#2f7fa8'
  ember: '#d04444'
  amber: '#d99a2b'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.25'
  display-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.4'
  stat-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: '1'
  label-mono:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: '0.08em'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-xs:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
rounded:
  sm: 0.375rem
  DEFAULT: 0.5rem
  lg: 0.625rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  container-max: 1280px
  gutter: 16px
---

## Brand & Style

Lamaranku is a **professional single-user job-application control center**. It reads as a calm, businesslike admin console rather than a gamified or decorative tracker. The brand personality is **competent, no-nonsense, and clear**.

The aesthetic is a **CoreUI-style admin console**:
- **Restrained palette:** neutral cool-gray canvas with a single indigo accent. Color is reserved for actions, selection, and state — never decoration.
- **Data-first density:** scannable tables, compact stat cards, tight component spacing. Information is the interface.
- **Mobile-first, desktop-denser:** a thumb-friendly bottom tab bar on phones, expanding to a dark slate sidebar + wider table layouts on desktop.
- **Reusable primitives:** one card, one button set, one form-control vocabulary across every screen.

## Colors

Neutrals carry the layout; the accent carries action; status colors carry state.

- **Canvas (`paper` #EEF1F5):** cool light gray app background on desktop and mobile.
- **Surface (`#FFFFFF`):** white cards on the gray canvas. Cards are defined by hairline borders, not shadows.
- **Ink (#1B2030) / Stone (#5B6478):** primary and secondary text. Stone also covers placeholders and meta.
- **Trailblaze (#3A5CD9):** the single indigo accent — primary buttons, active nav, focus rings, selection. Nothing decorative.
- **Status:** Moss (#19916C) for offer/accepted, Denim (#2F7FA8) for in-progress, Ember (#D04444) for rejected/destructive, Amber (#D99A2B) for streak/heat signals.

## Typography

Two faces, one job each.

1. **Plus Jakarta Sans (UI):** every heading, label, button, and body string. Weights 600–700 carry hierarchy; a single sans keeps the console calm.
2. **IBM Plex Mono (Data):** reserved for numeric stats, dates in tables, and measurement — never as decorative "technical" styling.

Type scale is tight (16→24→30px), with 11px uppercase micro-labels for table headers and stat labels.

## Layout & Spacing

- **Mobile (default):** fixed bottom tab bar (5 items); single-column cards; 16px gutters; bottom sheets for confirmations.
- **Desktop (≥768px):** fixed dark slate-900 sidebar (brand block, search, Menu links, user footer) with collapse to icon rail; white content on gray; 12-column grid capped at 1280px; dense tables.
- **Spacing rhythm:** 4px base, tight inside components (8–16px), generous between sections (32–48px).

## Elevation & Depth

- **Level 0:** gray canvas.
- **Level 1 (cards):** white surface + `1px` hairline border + a soft low-offset shadow (`0 1px 2px` + `0 1px 3px`) for subtle lift.
- **Level 2 (popovers/menus):** the same hairline border with a larger, softer shadow (`0 10px 24px`).
- **No colored glows, no hard offset shadows.**

## Shapes

- **Controls (buttons/inputs):** 8px radius (`rounded-md`).
- **Cards:** 10px radius (`rounded-lg`).
- **Status badges, streak dots:** pill/full radius.

## Components

### Buttons
- **Primary:** solid indigo `trailblaze`, white text, shadow-sm, hover darkens, focus ring.
- **Secondary:** white surface, `line-strong` border, ink text, hover grays.
- **Ghost:** borderless, stone text, hover tints.
- **Danger:** `ember` text on hairline `ember` border (`.btn-danger`) for destructive actions.
- Every button shares one shape (`rounded-md`, same padding, same icon size).

### Status Badges
- Small pill with a 15% tint of the status color and solid status text (e.g. `bg-moss/15 text-moss`). One shared `StatusBadge` component across all surfaces.

### Input Fields
- White surface, `line` border, 8px radius, 8px/12px padding. Labels are 14px medium ink above the field. Focus = `2px` indigo ring at 20% opacity.

### Cards
- White, `rounded-lg`, `1px line` border, low offset shadow. Section headers sit on a `border-b` with a 14px semibold title. Reusable `.card` class everywhere.

### Data Table
- White card wrapper; `surface-muted` header row with 11px uppercase semibold labels; zebra-free rows with `hover:bg-surface-muted`; dates in Plex Mono.

### Dark Sidebar (desktop)
- slate-900 background, white brand block with indigo logo tile, search-style link, "Menu" section (slate-400 label), links as white-on-hover with a solid indigo pill for the active item, user footer above collapse/theme/logout.

### Streak Trail
- Amber flame + number; 7 dots (filled `amber`, empty hairline stone). A light motivational signal, not a headline.

## Motion

- 150–200ms transitions for hover/focus/state only. No page-load choreography, no decorative animation. Motion conveys state or nothing.

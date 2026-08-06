---
name: Momentum Tracker
colors:
  surface: '#fff8f3'
  surface-dim: '#dfd9d4'
  surface-bright: '#fff8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f2ed'
  surface-container: '#f3ede8'
  surface-container-high: '#ede7e2'
  surface-container-highest: '#e7e1dc'
  on-surface: '#1d1b18'
  on-surface-variant: '#584238'
  inverse-surface: '#32302d'
  inverse-on-surface: '#f6f0ea'
  outline: '#8c7166'
  outline-variant: '#dfc0b3'
  surface-tint: '#a14000'
  primary: '#a14000'
  on-primary: '#ffffff'
  primary-container: '#ff7a33'
  on-primary-container: '#622400'
  inverse-primary: '#ffb694'
  secondary: '#036c4f'
  on-secondary: '#ffffff'
  secondary-container: '#9ef4cf'
  on-secondary-container: '#127255'
  tertiary: '#226584'
  on-tertiary: '#ffffff'
  tertiary-container: '#6ca8ca'
  on-tertiary-container: '#003c54'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb694'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7b2f00'
  secondary-fixed: '#9ef4cf'
  secondary-fixed-dim: '#82d7b3'
  on-secondary-fixed: '#002115'
  on-secondary-fixed-variant: '#00513a'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#92cef2'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#fff8f3'
  on-background: '#1d1b18'
  surface-variant: '#e7e1dc'
  paper: '#F7F6F3'
  ember: '#D14343'
  stone: '#8B887F'
  stone-light: '#E2E1DE'
typography:
  display-lg:
    fontFamily: Unbounded
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Unbounded
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Unbounded
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Unbounded
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.02em
  stat-lg:
    fontFamily: IBM Plex Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1280px
  gutter: 16px
---

## Brand & Style

The design system is built for the **Action-Oriented Job Seeker**. It moves away from the sterile, anxiety-inducing atmosphere of traditional spreadsheets, replacing it with an energetic, gamified, and momentum-driven environment. The brand personality is **vibrant, resilient, and forward-moving**.

The aesthetic follows a **Modern Tactical** style: 
- **High-Contrast Minimalism:** Leveraging the "Paper" and "Ink" foundation to make the "Trailblaze" primary color pop with intentionality.
- **Vibrant Professionalism:** Using a sophisticated palette that balances urgency (orange/red) with stability (green/blue).
- **Mobile-First Utility:** Prioritizing thumb-driven interactions, bottom sheets, and clear vertical information hierarchy.
- **Signature Gamification:** The "Streak Trail" serves as a unique visual anchor, turning the grind of job hunting into a tangible path of progress.

## Colors

The color palette is designed for maximum functional clarity.

- **Trailblaze (#FF7A33):** The heartbeat of the system. Used for primary actions, the "Fire" streak icon, and active progress indicators. It signifies energy and heat.
- **Paper (#F7F6F3) & Ink (#201E1B):** These provide a high-contrast, editorial feel. Use "Paper" for the global background and "Ink" for all primary messaging.
- **Status Tints:** 
    - **Moss (#1F7A5C):** Reserved for "Accepted" or "Offer" states.
    - **Denim (#2E6E8E):** Used for "Applied" and "Screening"—states that are in progress but not yet finalized.
    - **Ember (#D14343):** Indicates "Rejected" or critical "Delete" actions.
- **Stone (#8B887F):** Used for borders, secondary labels, and inactive "Streak" dots to maintain a clean, organized structure without visual clutter.

## Typography

This design system uses a tri-font pairing to distinguish between narrative, data, and UI.

1.  **Unbounded (Headings):** Used for large page titles and the main streak number. It is bold and expressive, giving the app a modern, tech-forward voice.
2.  **Plus Jakarta Sans (UI/Body):** The workhorse font. Used for all inputs, button text, and descriptions. Its friendly but professional curves balance the sharpness of Unbounded.
3.  **IBM Plex Mono (Data):** Used specifically for numerical stats, chart labels, and table cells. The monospaced nature ensures that numbers align perfectly, making data-dense views easier to scan.

## Layout & Spacing

The system follows an **8px grid** to ensure consistency.

### Mobile (Default)
- **Navigation:** Fixed bottom tab bar for easy thumb access.
- **Content:** Single column of cards. Margins are fixed at `16px` (md) on the sides.
- **Modals:** Use **Bottom Sheets** instead of centered modals to allow for easier one-handed use.

### Desktop (≥768px)
- **Navigation:** Collapsible left sidebar replacing the bottom tab bar.
- **Content:** Multi-column layout or dense data table.
- **Grid:** 12-column fluid grid with `24px` gutters. Content is capped at a `1280px` container width.

### Spacing Rhythm
Generous whitespace is used between sections (`2xl`) to reduce cognitive load during the job search process, while component internal spacing remains tight (`sm` to `md`) to keep related data together.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** and **Subtle Shadows** rather than heavy depth effects.

- **Level 0 (Background):** Paper (#F7F6F3).
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF). This creates a crisp distinction from the background.
- **Level 2 (Active/Hover):** A subtle, highly diffused shadow (e.g., `0 4px 20px rgba(32, 30, 27, 0.04)`) to lift the element.
- **Borders:** All cards and interactive elements use a `1px` border in `Stone-light` or `Stone` to define their silhouette clearly against the neutral background.
- **Overlays:** Semi-transparent backdrop blur (12px) for bottom sheets to maintain context of the page behind the interaction.

## Shapes

The design uses a **Rounded (2xl)** shape language to soften the high-contrast color palette and make the app feel approachable.

- **Primary Radius:** `0.5rem` (8px) for inputs and smaller buttons.
- **Large Radius (2xl):** `1rem` (16px) for cards, dashboard containers, and bottom sheets.
- **Full Radius (Pill):** Used for status badges and the "Streak Trail" dots to distinguish them from structural UI elements.
- **Streak Trail Dots:** Small 8x8px circular elements. Active dots are solid `Trailblaze`, while inactive dots are `1px` stone outlines.

## Components

### Buttons
- **Primary:** Solid `Trailblaze` with White `Plus Jakarta Sans` text. Bold weight.
- **Secondary:** Transparent with `1px Stone` border and `Ink` text.
- **Ghost:** No border/background, used for secondary actions like "Cancel."

### Status Badges
- Small, pill-shaped containers with a subtle background tint (10% opacity of the status color) and solid color text for high legibility (e.g., Moss text on a light Moss tint).

### Input Fields
- White background, `Stone-light` border, and `16px` (md) padding. Labels should use `IBM Plex Mono` in a smaller size for a "technical" look. Focus state uses a `2px Trailblaze` ring.

### Cards
- White background, `1rem` corner radius, `1px Stone-light` border. 
- **Application Card:** Features the company logo (left), Job Title (Unbounded sm), Status Badge (top right), and the Streak Trail (bottom).

### Streak Trail (Signature Component)
- A horizontal row of 7–14 dots. 
- Active days are filled with `Trailblaze`. 
- Current day has a subtle "pulse" animation.
- Accompanied by a `Fire` icon and an `Unbounded` stat for the total count.

### Bottom Sheets (Mobile)
- Triggered for filters and "Add New Job" actions. They slide from the bottom, covering 70-90% of the screen height, with a prominent "drag handle" at the top.
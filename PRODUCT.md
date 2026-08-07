# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A personal, single-user job tracker for Indonesian job seekers. One person uses it to keep an organized record of the applications they submit, the interviews and follow-ups they run, and the sources they come from — primarily from a phone, and on a desktop for denser reviewing and bulk entry.

## Product Purpose

Lamaranku helps a job seeker keep every application, follow-up, and interview in one clear place so nothing slips through the cracks during a job search. Success means the user can open it, see exactly where each application stands and what needs action, and record new applications in seconds.

## Positioning

A calm, professional job-application control center: data-first and scannable rather than gamified. Its distinguishing move is turning a chaotic job search into a tidy, reviewable dashboard (with a streak of daily activity as a light secondary signal) that a single user owns end to end.

## Operating Context

- Used daily while job hunting, primarily on mobile (on the go), with desktop used for dense review and bulk entry.
- Indonesian-language UI (`lang="id"`), section labels in Indonesian (Dashboard, Lamaran, Statistik, Sumber, Akun).

## Capabilities and Constraints

- Five sections: Dashboard (overview + recent), Lamaran (application list with search/filter), Statistik (funnel/charts over a range), Sumber (tracking sources), Akun (profile/settings).
- Features to preserve: streak trail, application CRUD, status and source filters, bulk import from CSV (papaparse) / Excel (xlsx), range filter, funnel, momentum chart, follow-up and interview reminders, theme toggle, sidebar collapse, search.
- Backend: InsForge (Postgres) via `@insforge/sdk`; auth via sign-in; data lives in `job_applications` (+ `sources`, `profiles`).
- Stack is fixed: Next.js 16 (App Router), React 19, Tailwind CSS v4, `@insforge/sdk`, lucide-react icons, chart.js.
- Indonesian language copy for labels and messages.

## Brand Commitments

- Existing name "Lamaranku" (Lamar + anku) must remain as the product wordmark.
- Visual direction requested by owner: a clean, professional, no-nonsense look in the spirit of a CoreUI-style admin panel — data first, scannable, dense where useful, calm and businesslike rather than gamified.
- Mobile-first design, with the layout adapting (bottom tab → desktop sidebar) on web.
- Components must be reusable.

## Evidence on Hand

- DESIGN.md: incumbent "Momentum Tracker / Trailblaze" system (warm paper/orange, Unbounded + Plus Jakarta Sans + IBM Plex Mono). Treat as evidence/anti-reference for the revamp, not as the target.
- Live source component files under `src/components/` and pages under `src/app/`.

## Product Principles

1. Data first: the fastest path to "what needs my attention" wins.
2. In-person Calm and professional: businesslike density, restrained color, unambiguous states.
3. Mobile is core, desktop is denser — never desktop-first thinking that leaves phones behind.
4. Reuse components rather than bespoke per-page UI, to keep every screen consistent.
5. Preserve all routes, data model, features, and functionality across the revamp; only the presentation changes.
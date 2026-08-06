# Full Redesign ("TRAILBLAZE" Reference) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire app (sidebar, all pages, statistik bento with working range filter) following the approved "TRAILBLAZE" reference design, in Bahasa Indonesia, without touching functionality/RLS/dark mode.

**Architecture:** Layered. Task 1 builds the design-system tokens (typography roles). Tasks 2–3 build reusable components (`PageHeader`, `StatCard`, `Card`, `RangeFilter`, `Sidebar`). Task 4 extends the data layer (`lib/stats.ts`) with range-aware stats + streak/rejections/funnel, plus a `statistik/actions.ts` server action. Tasks 5–11 apply components to each page. No new dependencies, no schema changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, chart.js + react-chartjs-2, @tanstack/react-query, @insforge/sdk, lucide-react.

## Global Constraints

- **No commits** — user instruction "jgn dulu di commit" overrides the plan's commit steps. Every task ends with `git diff HEAD -- <files>` review + `npm run lint` + `npm run build`. NO COMMIT.
- **No new dependencies.** Only chart.js / react-chartjs-2 (already installed).
- **No functional changes**: RLS, schema, server actions, ConfirmDialog/Toast/error-Modal, TanStack flows, auth, dark-mode preserved.
- **Bahasa Indonesia** UI copy throughout.
- Mobile bottom bar retained unchanged; desktop sidebar redesigned.
- Reuse tokens `trailblaze/moss/denim/ember/paper/surface/ink/stone/line/shadow-card` and classes `.field/.btn-primary/.btn-secondary/.btn-ghost/.card`.
- Every task ends: `npm run lint` (0 errors) then `npm run build` (14 routes) then `git diff HEAD -- <files>` review. NO COMMIT.
- Ember styling reserved for destructive actions only.

---

## Task 1: Typography role tokens

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: Tailwind utilities `text-display-lg`, `text-display-sm`, `text-headline-md`, `text-headline-sm`, `text-stat-lg`, `text-label-mono`, `text-body-md`, `text-body-lg`, `text-body-sm`. Fonts `font-display`/`font-mono` already exist.

- [ ] **Step 1: Confirm no existing `--text-*` keys**

Run: `Select-String -Path src/app/globals.css -Pattern "--text-"`. Expected: no matches.

- [ ] **Step 2: Append font-size tokens to `@theme inline`**

Open `src/app/globals.css`. Inside the existing `@theme inline { ... }` block (after the `--shadow-card: var(--shadow-card);` line), append:

```css
  /* Typography roles */
  --text-display-lg: 48px;
  --text-display-sm: 32px;
  --text-headline-md: 24px;
  --text-headline-sm: 18px;
  --text-stat-lg: 24px;
  --text-label-mono: 14px;
  --text-body-md: 16px;
  --text-body-lg: 18px;
```

For line-height/weight/letter-spacing, Tailwind v4 supports modifier variables. Add them in a plain `@theme {}` block at the end of the file (outside `@layer`):

```css
@theme {
  --text-display-lg--line-height: 1.1;
  --text-display-lg--font-weight: 700;
  --text-display-sm--line-height: 1.2;
  --text-display-sm--font-weight: 700;
  --text-headline-md--line-height: 1.3;
  --text-headline-md--font-weight: 600;
  --text-headline-sm--line-height: 1.4;
  --text-headline-sm--font-weight: 600;
  --text-stat-lg--line-height: 1;
  --text-stat-lg--font-weight: 600;
  --text-label-mono--line-height: 1;
  --text-label-mono--letter-spacing: 0.02em;
  --text-label-mono--font-weight: 500;
  --text-body-md--line-height: 1.5;
  --text-body-lg--line-height: 1.6;
}
```

Note: some of these end with `--` (`--text-display-lg--line-height`). Keep the trailing double-dash exactly — that is Tailwind's theme-modifier convention.

- [ ] **Step 3: Verify utilities compile**

Run `npm run dev` once (or `npm run build`) to confirm `text-display-lg`, `text-stat-lg`, `text-label-mono`, `text-body-md` compile with no Tailwind error. If a modifier name is rejected, drop the `@theme` modifier block (keep only the base sizes in `@theme inline`) — font-size utilities alone are acceptable.

- [ ] **Step 4: Verify**

Run: `npm run lint` then `npm run build`. Pass = 0 errors, build succeeds. `git diff HEAD -- src/app/globals.css` = only additive changes.

---

## Task 2: PageHeader, StatCard, Card, RangeFilter components

**Files:**
- Create: `src/components/page-header.tsx`
- Create: `src/components/stat-card.tsx`
- Create: `src/components/card.tsx`
- Create: `src/components/range-filter.tsx`

**Interfaces:**
- Consumes: nothing external (pure presentational).
- Produces:
  - `PageHeader({ title, description?, children? })`
  - `StatCard({ label, value, unit?, icon?, tone?, progress?, solid? })`
  - `Card({ title?, subtitle?, action?, children, className? })`
  - `RangeFilter({ range, onChange })` + exported `type Range = '7d' | '30d' | 'all'`

- [ ] **Step 1: Create `src/components/page-header.tsx`**

```tsx
export function PageHeader({ title, description, children }: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-display-lg text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-body-md text-stone">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
```

- [ ] **Step 2: Create `src/components/stat-card.tsx`**

```tsx
const fillByTone: Record<string, string> = {
  primary: 'bg-trailblaze',
  moss: 'bg-moss',
  denim: 'bg-denim',
  ember: 'bg-ember',
  stone: 'bg-stone',
}
const iconTone: Record<string, string> = {
  primary: 'text-trailblaze',
  moss: 'text-moss',
  denim: 'text-denim',
  ember: 'text-ember',
  stone: 'text-stone',
}

export function StatCard({ label, value, unit, icon, tone = 'primary', progress, solid }: {
  label: string
  value: string
  unit?: string
  icon?: React.ReactNode
  tone?: keyof typeof fillByTone
  progress?: number
  solid?: boolean
}) {
  if (solid) {
    return (
      <div className="relative flex h-32 flex-col justify-between overflow-hidden rounded-xl border border-trailblaze bg-trailblaze p-4 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
        {icon && <div className="absolute -right-4 -top-4 opacity-20">{icon}</div>}
        <span className="text-label-mono uppercase tracking-wider text-white/80">{label}</span>
        <div className="flex flex-col">
          <span className="text-stat-lg text-4xl">{value}{unit && <span className="ml-1 text-lg">{unit}</span>}</span>
          <span className="mt-1 text-sm text-white/80">Pertahankan!</span>
        </div>
      </div>
    )
  }
  return (
    <div className="relative flex h-32 flex-col justify-between overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <span className="text-label-mono uppercase tracking-wider text-stone">{label}</span>
        {icon && <span className={iconTone[tone]}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-stat-lg text-4xl text-ink">{value}</span>
        {unit && <span className="text-label-mono text-stone">{unit}</span>}
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-stone/10">
        <div className={`h-full ${fillByTone[tone]}`} style={{ width: `${Math.min(100, progress ?? 0)}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/card.tsx`**

```tsx
export function Card({ title, subtitle, action, children, className }: {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 shadow-card ${className ?? ''}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-headline-sm text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-stone">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
```

- [ ] **Step 4: Create `src/components/range-filter.tsx`**

```tsx
const OPTIONS = [
  { value: '7d', label: '7 Hari' },
  { value: '30d', label: '30 Hari' },
  { value: 'all', label: 'Semua Waktu' },
] as const

export type Range = (typeof OPTIONS)[number]['value']

export function RangeFilter({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1 text-label-mono transition ${
            range === o.value
              ? 'border-trailblaze bg-trailblaze/10 font-bold text-trailblaze'
              : 'border-line bg-surface text-stone hover:bg-stone/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Verify**

`npm run lint` then `npm run build`. Pass = 0 errors. `git diff HEAD -- src/components` (new untracked files: use `git add -N src/components/page-header.tsx src/components/stat-card.tsx src/components/card.tsx src/components/range-filter.tsx` then `git diff HEAD -- src/components`), and if any of `text-headline-sm`, `text-stat-lg`, `text-body-md`, `text-label-mono` did not compile in Task 1, replace those class usages with plain sizes (`text-lg`, `text-2xl`, `text-base`, `text-sm`, `text-[13px] uppercase tracking-wide font-mono`) in these files.

---

## Task 3: Sidebar rewrite (`nav.tsx`) + layout wiring

**Files:**
- Modify: `src/components/nav.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/globals.css` (nav width)

**Interfaces:**
- Consumes: `ConfirmDialog`, `ThemeToggle`, `calcStreak` (from `lib/streak.ts`), `serverDb`, `getCurrentUser`.
- Produces: `Nav({ streak })` — desktop sidebar per reference + unchanged mobile bottom bar. Streak passed down from layout.

- [ ] **Step 1: Update `(app)/layout.tsx` to compute streak and pass nav**

Replace the whole file with:

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/server-user'
import { serverDb } from '@/lib/server-db'
import { calcStreak } from '@/lib/streak'
import { Nav } from '@/components/nav'
import { Toaster } from '@/components/toast'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const insforge = await serverDb()
  const datesRes = await insforge.from('job_applications').select('applied_date').order('applied_date', { ascending: false }).limit(366)
  const streak = calcStreak((datesRes.data ?? []).map((d) => (d as { applied_date: string }).applied_date))

  return (
    <div className="mx-auto w-full max-w-6xl pb-20 md:pb-0">
      <div className="md:pl-[var(--nav-w)]">{children}</div>
      <Nav user={user} streak={streak} />
      <Toaster />
    </div>
  )
}
```

- [ ] **Step 2: Update `Nav` props**

In `src/components/nav.tsx`, change signature to `export function Nav({ user, streak }: { user: any; streak: number })`. Derive profile display from user:

```tsx
const displayName = user?.profile?.name || user?.email || ''
const initialChar = (displayName || '?').charAt(0).toUpperCase()
const roleLine = user?.email || ''
```

`user.profile.name` is what `UserSchema` provides (see `profile-form.tsx:26`, which reads `user?.profile?.name`). Keep `user` typed as `any` to satisfy existing call sites; refine only if TS complains.

- [ ] **Step 3: Rewrite the desktop `<aside>`**

Replace the entire current `<aside ...>...</aside>` with the reference-style sidebar. Keep: collapse toggle div, ThemeToggle, logout + ConfirmDialog. New layout top-to-bottom:

```tsx
<aside
  className={`fixed left-0 top-0 hidden h-dvh flex-col border-r border-line bg-paper transition-[width] duration-200 md:flex ${
    collapsed ? 'w-[4.5rem]' : 'w-64'
  }`}
>
  {/* Brand */}
  <div className={`flex items-center gap-2 px-3 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
    <span className="h-3 w-3 shrink-0 rounded-full bg-trailblaze" />
    {!collapsed && (
      <span className="font-display text-xl font-extrabold leading-none tracking-tight">
        <span className="text-trailblaze">Lamar</span>
        <span className="text-ink">anku</span>
      </span>
    )}
  </div>

  {/* Profile header */}
  {!collapsed && (
    <div className="mx-2 mb-4 flex items-center gap-3 border-b border-line px-2 pb-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-trailblaze/15 font-display text-lg font-bold text-trailblaze">
        {initialChar}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-ink">{displayName}</p>
        <div className="mt-0.5 flex items-center gap-1">
          <Flame size={12} className="text-trailblaze" fill="currentColor" />
          <span className="font-mono text-xs font-bold text-trailblaze">{streak} hari streak</span>
        </div>
        <p className="truncate text-xs text-stone">{roleLine}</p>
      </div>
    </div>
  )}

  {/* Nav links */}
  <nav className="flex flex-col gap-1 px-2">
    {items.map(({ href, label, icon: Icon }) => {
      const active = isActive(href)
      return (
        <Link
          key={href}
          href={href}
          title={collapsed ? label : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            collapsed ? 'justify-center px-0'
          } ${active ? 'bg-trailblaze/15 text-trailblaze' : 'text-stone hover:bg-stone/10'}`}
        >
          <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
          {!collapsed && label}
        </Link>
      )
    })}
  </nav>

  {/* Bottom */}
  <div className="mt-auto flex flex-col gap-1 px-2 pb-4">
    <Link
      href="/lamaran/baru"
      title={collapsed ? 'Tambah Lamaran' : undefined}
      className={`inline-flex items-center justify-center gap-1 rounded-lg bg-trailblaze px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 ${
        collapsed ? 'w-full' : ''
      }`}
    >
      <Plus size={16} /> {!collapsed && 'Tambah Lamaran'}
    </Link>
    <div className={`flex items-center gap-1 ${collapsed ? 'flex-col' : 'justify-between'}`}>
      <ThemeToggle />
      <button type="button" onClick={toggleCollapse} aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'} className="rounded-lg p-2 text-stone hover:bg-stone/10">
        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
      </button>
    </div>
    <button
      type="button"
      onClick={() => setConfirmLogout(true)}
      title={collapsed ? 'Keluar' : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ember hover:bg-ember/10 ${
        collapsed ? 'justify-center px-0' : ''
      }`}
    >
      <LogOut size={18} className="shrink-0" /> {!collapsed && 'Keluar'}
    </button>
  </div>
</aside>
```

Add `Flame` and `Plus` to the lucide-react import. Keep the mobile bottom bar exactly as-is. Keep the `ConfirmDialog` at the end (unchanged).

- [ ] **Step 4: Update sidebar width token**

In `src/app/globals.css`, change `:root { --nav-w: 13rem; }` → `:root { --nav-w: 16rem; }` to match `w-64`. Collapsed stays `4.5rem` and `html[data-nav="collapsed"] { --nav-w: 4.5rem; }` is unchanged.

- [ ] **Step 5: Verify**

`npm run lint` then `npm run build`. Pass = 0 errors, build succeeds. `git diff HEAD` for all three files.

---

## Task 4: Data layer — range-aware stats

**Files:**
- Modify: `src/lib/stats.ts`
- Create: `src/app/(app)/statistik/actions.ts`

**Interfaces:**
- Consumes: `serverDb`, `calcStreak` (from `lib/streak.ts`).
- Produces:
  - `export type StatsRange = '7d' | '30d' | 'all'`
  - `export type Stats = { total; interviews; rejected; streak; growth: { labels: string[]; values: number[] }; funnel: { labels: string[]; values: number[] }; distribution: { name: string; value: number }[] }`
  - `export async function getStats(range: StatsRange): Promise<Stats>` in `lib/stats.ts`
  - `export async function fetchStats(range: StatsRange): Promise<Stats>` server action in `statistik/actions.ts`

- [ ] **Step 1: Rewrite `src/lib/stats.ts`**

Replace the whole file:

```ts
import { serverDb } from '@/lib/server-db'
import { calcStreak } from '@/lib/streak'

export type StatsRange = '7d' | '30d' | 'all'

export type Stats = {
  total: number
  interviews: number
  rejected: number
  streak: number
  growth: { labels: string[]; values: number[] }
  funnel: { labels: string[]; values: number[] }
  distribution: { name: string; value: number }[]
}

const FUNNEL_STAGES = ['Applied', 'Screening', 'HR Interview', 'Technical Interview', 'Offer', 'Accepted']
const INTERVIEW_STATUSES = ['HR Interview', 'Technical Interview']

export async function getStats(range: StatsRange): Promise<Stats> {
  const db = await serverDb()

  const now = new Date()
  const cutoff = range === 'all' ? new Date(0) : new Date(now.getTime() - (range === '7d' ? 7 : 30) * 86400000)

  const [appsRes, historyRes] = await Promise.all([
    db.from('job_applications').select('applied_date, current_status, sources(name)'),
    db.from('application_status_history').select('status, application_id'),
  ])

  const apps = (appsRes.data ?? []) as { applied_date: string; current_status: string; sources?: { name?: string | null } | null }[]
  const inRange = apps.filter((a) => {
    const d = new Date(a.applied_date)
    return range === 'all' || d >= cutoff
  })

  const total = inRange.length
  const interviews = inRange.filter((a) => INTERVIEW_STATUSES.includes(a.current_status)).length
  const rejected = inRange.filter((a) => a.current_status === 'Rejected').length

  const streak = calcStreak(apps.map((a) => a.applied_date))

  // growth: last 8 buckets, week-aligned for 30d/all, day-aligned for 7d
  const buckets = range === '7d' ? 7 : 8
  const stepMs = range === '7d' ? 86400000 : 7 * 86400000
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const labels: string[] = []
  const values: number[] = []
  for (let i = buckets - 1; i >= 0; i--) {
    const bucketEnd = new Date(end.getTime() - i * stepMs)
    const bucketStart = new Date(bucketEnd.getTime() - stepMs)
    labels.push(range === '7d' ? bucketStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : `M${buckets - i}`)
    values.push(apps.filter((a) => { const d = new Date(a.applied_date); return d >= bucketStart && d < bucketEnd }).length)
  }

  // funnel: distinct apps that ever reached each stage
  const reached = new Map<string, Set<string>>()
  for (const h of (historyRes.data ?? []) as { status: string; application_id: string }[]) {
    if (!reached.has(h.status)) reached.set(h.status, new Set())
    reached.get(h.status)!.add(h.application_id)
  }
  const base = Math.max(1, total)
  const funnel = {
    labels: FUNNEL_STAGES,
    values: FUNNEL_STAGES.map((s) => Math.round(((reached.get(s)?.size ?? 0) / base) * 100)),
  }

  // distribution by source (in-range)
  const src = new Map<string, number>()
  for (const a of inRange) {
    const name = a.sources?.name
    if (name) src.set(name, (src.get(name) ?? 0) + 1)
  }
  const distribution = [...src.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  return { total, interviews, rejected, streak, growth: { labels, values }, funnel, distribution }
}
```

(Remove the old `export const dynamic = 'force-dynamic'` from stats.ts — it belongs on the page/route; the page already sets `dynamic`. If the old file had it, migrate to the page. Actually to keep behavior, add `export const dynamic = 'force-dynamic'` in `statistik/page.tsx` if it was there.)

- [ ] **Step 2: Create `src/app/(app)/statistik/actions.ts`**

```ts
'use server'

import { getStats } from '@/lib/stats'
import type { StatsRange, Stats } from '@/lib/stats'

export async function fetchStats(range: StatsRange): Promise<Stats> {
  return getStats(range)
}
```

- [ ] **Step 3: Verify**

`npm run lint` then `npm run build`. Pass = 0 errors. `git diff HEAD` for both files + `git add -N` the new action.

---

## Task 5: Statistik page — bento redesign

**Files:**
- Modify: `src/app/(app)/statistik/page.tsx`
- Create: `src/app/(app)/statistik/statistik-client.tsx`
- Create: `src/components/momentum-chart.tsx`
- Create: `src/components/funnel.tsx`
- Create: `src/components/source-list.tsx`
- Delete: `src/components/charts.tsx` (unused after this)

**Interfaces:**
- Consumes: `fetchStats` (Task 4), `StatCard`/`Card`/`RangeFilter` (Task 2), `getStats`.
- Produces: rebuilt `/statistik` page.

- [ ] **Step 1: Verify old `charts.tsx` is only used by statistik**

Run: `grep -rn "components/charts" src`. Confirm only `statistik/page.tsx`. If isolated, delete `src/components/charts.tsx` after rewriting the page.

- [ ] **Step 2: Rewrite `src/app/(app)/statistik/page.tsx`**

```tsx
import { getStats } from '@/lib/stats'
import { StatistikClient } from './statistik-client'

export default async function StatistikPage() {
  const stats = await getStats('30d')
  return <StatistikClient initial={stats} />
}

export const dynamic = 'force-dynamic'
```

- [ ] **Step 3: Create `src/app/(app)/statistik/statistik-client.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send, MessagesSquare, XCircle, Flame } from 'lucide-react'
import { fetchStats } from './actions'
import { RangeFilter, type Range } from '@/components/range-filter'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { MomentumChart } from '@/components/momentum-chart'
import { Funnel } from '@/components/funnel'
import { SourceList } from '@/components/source-list'
import type { Stats } from '@/lib/stats'

export function StatistikClient({ initial }: { initial: Stats }) {
  const [range, setRange] = useState<Range>('30d')

  const { data } = useQuery({
    queryKey: ['stats', range],
    queryFn: () => fetchStats(range),
    initialData: initial,
    staleTime: 0,
  })

  const s = data ?? initial

  return (
    <main className="p-4">
      <PageHeader title="Kinerja" description="Pantau momentum, temukan hambatan, dan optimalkan strategi pelamaranmu.">
        <RangeFilter range={range} onChange={setRange} />
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Lamaran" value={String(s.total)} icon={<Send size={20} />} tone="primary" progress={Math.min(100, s.total)} />
        <StatCard label="Interview" value={String(s.interviews)} icon={<MessagesSquare size={20} />} tone="moss" progress={Math.min(100, s.interviews * 4)} />
        <StatCard label="Ditolak" value={String(s.rejected)} icon={<XCircle size={20} />} tone="ember" progress={Math.min(100, s.rejected * 4)} />
        <StatCard solid label="Streak" value={`${s.streak}`} unit="Hari" icon={<Flame size={80} fill="currentColor" />} progress={100} />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MomentumChart labels={s.growth.labels} values={s.growth.values} />
        </div>
        <div className="flex flex-col gap-4">
          <Funnel labels={s.funnel.labels} values={s.funnel.values} />
          <SourceList items={s.distribution} />
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Create `src/components/momentum-chart.tsx`**

```tsx
'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js'
import { Card } from '@/components/card'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

export function MomentumChart({ labels, values }: { labels: string[]; values: number[] }) {
  return (
    <Card title="Kemiringan Lamaran" subtitle="Lamaran per periode.">
      <div className="h-64">
        <Line
          data={{
            labels,
            datasets: [{
              label: 'Lamaran',
              data: values,
              borderColor: '#FF7A33',
              backgroundColor: 'rgba(255,122,51,0.15)',
              tension: 0.3,
              fill: true,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: 'rgba(139,136,127,0.15)' } },
              y: { grid: { color: 'rgba(139,136,127,0.15)' }, beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
            },
          }}
        />
      </div>
    </Card>
  )
}
```

- [ ] **Step 5: Create `src/components/funnel.tsx`**

```tsx
const stageColors = ['#FF7A33', '#2E6E8E', '#1F7A5C', '#226584', '#8B887F', '#D9A441']

export function Funnel({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <h2 className="text-headline-sm text-ink">Funnel Velocity</h2>
      <div className="mt-4 flex flex-col justify-center gap-3">
        {labels.map((label, i) => (
          <div key={label}>
            <div className="mb-1 flex justify-between font-mono text-xs">
              <span className="text-ink">{label}</span>
              <span className="text-stone">{values[i]}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-stone/10">
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.round((values[i] / max) * 100)}%`, backgroundColor: stageColors[i % stageColors.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Create `src/components/source-list.tsx`**

```tsx
const dotColors = ['#FF7A33', '#1F7A5C', '#2E6E8E', '#D14343', '#8B887F', '#D9A441']

export function SourceList({ items }: { items: { name: string; value: number }[] }) {
  const total = items.reduce((acc, i) => acc + i.value, 0)
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <h2 className="text-headline-sm text-ink">Origin Vectors</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-stone">Belum ada data sumber.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item, i) => (
            <li key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dotColors[i % dotColors.length] }} />
                <span className="text-body-md text-ink">{item.name}</span>
              </div>
              <span className="text-stat-lg text-lg text-ink">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 7: Verify**

`npm run lint` then `npm run build`. Pass = 0 errors. Confirm `charts.tsx` deleted + no dangling import. `git diff --stat` + `git add -N` the new files first.

---

## Task 6: Dashboard restyle

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `StatCard` (Task 2).

- [ ] **Step 1: Rewrite header + stat cards**

Keep all server queries. Replace the JSX from the `return (` `main` up to `<StreakTrail ...>` and the 2-card grid:

```tsx
<main className="p-4">
  <PageHeader title="Lamaranku" description="Ringkasan aktivitas melamar kamu.">
    <Link href="/lamaran/import" className="btn-secondary">
      <FileUp size={16} /> Impor
    </Link>
    <Link href="/lamaran/baru" className="btn-primary">
      <Plus size={16} /> Tambah
    </Link>
  </PageHeader>

  <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <StatCard label="Total Lamaran" value={String(total)} icon={<Send size={20} />} tone="primary" progress={Math.min(100, total)} />
    <StatCard label="Perlu Tindakan" value={String(followup)} icon={<Bell size={20} />} tone="denim" progress={Math.min(100, followup * 10)} />
    <StatCard solid label="Streak" value={`${streak}`} unit="Hari" icon={<Flame size={40} fill="currentColor" />} progress={100} />
  </section>

  <div className="mt-4">
    <StreakTrail streak={streak} dates={dates} todayCount={todayCount} />
    <div className="mt-4">
      <LamaranList variant="compact" sources={sources} initialItems={recent} />
    </div>
  </div>
</main>
```

Add imports: `PageHeader`, `StatCard`, and `Send, Bell, Flame` from lucide. Keep `Plus`, `FileUp`. Keep `StreakTrail`.

- [ ] **Step 2: Verify**

`npm run lint` then `npm run build`. Pass = 0 errors. `git diff -- src/app/(app)/dashboard/page.tsx`.

---

## Task 7: Lamaran list + detail restyle

**Files:**
- Modify: `src/app/(app)/lamaran/page.tsx` (header)
- Modify: `src/components/lamaran-list.tsx` (column labels)
- Modify: `src/app/(app)/lamaran/[id]/page.tsx` (hero + section titles)

**Interfaces:**
- Consumes: `PageHeader` (Task 2).

- [ ] **Step 1: Lamaran list page header**

In `lamaran/page.tsx`, replace the inline `<header>` with:

```tsx
<PageHeader title="Lamaran" description="Semua lamaran yang kamu kirim.">
  <Link href="/lamaran/import" className="btn-secondary">
    <FileUp size={16} /> Impor
  </Link>
  <Link href="/lamaran/baru" className="btn-primary">
    <Plus size={16} /> Tambah
  </Link>
</PageHeader>
```

Remove `<header>`/`</header>`; add imports `PageHeader`.

- [ ] **Step 2: Table column headers mono**

In `lamaran-list.tsx`, the desktop `<thead>` `th` classes `text-xs uppercase tracking-wide text-stone` → `font-mono text-[11px] uppercase tracking-wider text-stone`. Leave `p-3`.

- [ ] **Step 3: Detail hero**

In `[id]/page.tsx`: change `<h1 className="font-display text-2xl font-bold leading-tight">` → `<h1 className="text-display-lg leading-tight text-ink">`. Section title moments (`<h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-stone">`) → `<h2 className="mb-3 text-headline-sm text-ink">`. Do this for all 4 section titles (Detail, Deskripsi, Catatan, Riwayat). Note the `Riwayat Status` one has `mb-4` — switch class to `mb-4 text-headline-sm text-ink`.

- [ ] **Step 4: Verify**

`npm run lint` then `npm run build`. Pass = 0 errors. `git diff` for the three files.

---

## Task 8: Sumber + Akun restyle

**Files:**
- Modify: `src/app/(app)/sumber/sources-client.tsx` (header)
- Modify: `src/app/(app)/sumber/edit-dialog.tsx` (optional title)
- Modify: `src/app/(app)/akun/page.tsx` (header)
- Modify: `src/app/(app)/akun/profile-form.tsx` (section headings)

**Interfaces:**
- Consumes: `PageHeader` (Task 2), existing `.card`/`.field`/`btn-*`.

- [ ] **Step 1: `sources-client.tsx` header**

Replace `<header className="mb-6">...</header>` with `<PageHeader title="Sumber Lamaran" description="Sumber tempat kamu menemukan lowongan." />`. Add import.

- [ ] **Step 2: `akun/page.tsx` header**

Replace inline `<header className="mb-6"><h1 ...>Akun</h1></header>` → `<PageHeader title="Akun" description="Kelola profil dan preferensi akun kamu." />`. Add import.

- [ ] **Step 3: `profile-form.tsx` section headings**

Section title `className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-stone"` → `text-headline-sm text-ink` (keep `mb-4`). Also the card headers profile section uses `font-display text-lg font-bold` for the name — keep as-is or bump (`text-display-sm`). Keep subtle. Ensure the two `.card`-style sections (`shadow-card`) remain.

- [ ] **Step 4: Verify**

`npm run lint` then `npm run build`. Pass = 0 errors. `git diff` for all four files.

---

## Task 9: Forms + import restyle

**Files:**
- Modify: `src/app/(app)/lamaran/baru/page.tsx`
- Modify: `src/app/(app)/lamaran/[id]/edit/page.tsx`
- Modify: `src/app/(app)/lamaran/import/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 2).

- [ ] **Step 1: `baru/page.tsx` — replace `<h1 className="mb-6 font-display text-2xl font-bold">Tambah Lamaran</h1>` with `<PageHeader title="Tambah Lamaran" description="Catat lamaran baru yang kamu kirim." />` after the back link. Add import.**

- [ ] **Step 2: `[id]/edit/page.tsx` — same, title "Edit Lamaran".**

- [ ] **Step 3: `import/page.tsx` — same, title "Import Lamaran", description "Upload .xlsx atau .csv — baris duplikat akan ditandai sebelum di-import."**

- [ ] **Step 4: Verify**

`npm run lint` then `npm run build`. `git diff` for the three files.

---

## Task 10: Final verification pass

**Files:**
- None (verification only)

- [ ] **Step 1: Lint**

`npm run lint` → 0 errors.

- [ ] **Step 2: Build**

`npm run build` → succeeds, 14 routes.

- [ ] **Step 3: Manual checklist (browser if available; else source-level)**

- Sidebar (desktop) shows brand + profile header (avatar initial, name, streak, role line) + nav links + "Tambah Lamaran" CTA + ThemeToggle/collapse/Keluar. Collapsed = `w-[4.5rem]` icon-only.
- Mobile bottom bar unchanged (5 items, grid-cols-5, Akun reachable).
- `/statistik` renders 4 KPI cards + bento (line chart + funnel + source list). Switching 7/30/Semua refetches and updates numbers.
- `/dashboard` header + 3 stat cards + StreakTrail + compact list.
- `/lamaran`, `/lamaran/[id]`, `/sumber`, `/akun` each show hero header via `PageHeader`.
- Books: hero `text-display-lg` everywhere; smaller section titles `text-headline-sm`; column labels mono.
- Ember/danger (ConfirmDialog confirm, logout, delete) still ember. `.field`, `.btn-*` unchanged.
- Dark mode still flips; no `bg-white`; toasts/error modal still work.

---

## Self-Review Notes

- Spec coverage: Design system (Section 2) → Tasks 1–2; Sidebar (Section 3) → Task 3; Statistik (Section 4) → Task 5; Data (Section 6) → Task 4; other pages (Section 5) → Tasks 6–9; verification → Task 10. `--nav-w` update included (Task 3). Streak defined global-to-today (Task 4). `bg-surface-variant` replaced by `bg-stone/10` in components (avoids undefined token).
- Placeholder-free: yes — code for every step.
- Type consistency: `Stats`, `StatsRange`, `fetchStats`, `Range`, `StatCard` props, `PageHeader` props, `Card` props consistent across tasks. `useState<Range>` / `onChange: (r: Range) => void` match RangeFilter signature.
- Ordering: Task 5 depends on Task 4 (fetchStats) and Task 2 (components). Task 3 (nav) independent.
- NO COMMIT at any task (user constraint).
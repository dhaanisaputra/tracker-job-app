# Phase 2 Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Phase 1 MVP: dedicated `/lamaran` list with CRUD actions, dashboard recent-activity card, centered modal for Sumber edits, richer Akun page backed by a new `profiles` table, collapsible sidebar with logout + 2-tone wordmark, dark/light mode, and autosizing textarea for job descriptions.

**Architecture:** Reuse one `LamaranList` component in two modes — full (filters, pagination, three-dots CRUD) on `/lamaran` and compact (5 latest, server-rendered) on the dashboard. New `profiles` table with `auth.uid()` RLS + seed trigger. Dark mode via semantic CSS tokens in `globals.css` that flip under a `.dark` class on `<html>`, with an inline FOUC-prevention script. Sidebar collapse is a client component that persists to localStorage and drives layout padding via a CSS variable.

**Tech Stack:** Next.js 16.3 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, `@insforge/sdk` (postgrest-js backed: `.insert([])`, `.upsert()`, `.range()`, `.order()`, `.eq()`), TanStack Query, lucide-react.

## Global Constraints

- **No commits** — user said "jgn dulu di commit". Do all work, run lint/build, but do NOT `git commit` (except the spec doc which is already written and also not committed). Verification is lint + build + manual.
- Single-user auth: OTP email, RLS `auth.uid()` everywhere. No service-role key in client code.
- No new npm dependencies — dark mode, modal, autosize textarea all use existing stack (Tailwind v4, React, lucide-react).
- UI copy in Indonesian (existing pattern).
- All DB writes through RLS-enforced client: server via `serverDb()` (cookies), browser via `createBrowserClient()` (session). Existing helpers unchanged.
- Do not break existing routes: `/sign-in`, `/dashboard`, `/statistik`, `/sumber`, `/lamaran/baru`, `/lamaran/import`, `/lamaran/[id]`, `/lamaran/[id]/edit`.
- Insert takes an array: `insert([{ ... }])`.

---

### Task 1: SQL migration — `profiles` table + RLS + seed trigger

**Files:**
- Create: `sql/profiles.sql`

**Interfaces:**
- Consumes: nothing
- Produces: `public.profiles` table (columns `id`, `full_name`, `target_role`, `linkedin_url`, `portfolio_url`, `salary_expectation`, `phone`, `updated_at`) with RLS `auth.uid() = id`; trigger `seed_default_profile` on `auth.users` insert.

- [ ] **Step 1: Write the SQL migration file**

```sql
-- Run this in the InsForge SQL editor for the project:
-- https://5fr37au2.ap-southeast.insforge.app

-- Profil user (dikelola sendiri, single-user). Phone column ada tapi belum dipakai UI.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  target_role text,
  linkedin_url text,
  portfolio_url text,
  salary_expectation numeric,
  phone text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "user can manage own profile"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- Auto-seed profil kosong saat user baru mendaftar
create or replace function seed_default_profile() returns trigger as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_seed_default_profile
after insert on auth.users
for each row execute function seed_default_profile();
```

- [ ] **Step 2: User runs the migration**

The user must execute this file in the InsForge SQL editor (same place as `sql/schema.sql`). Ask them to run it before continuing. Verification: `profiles` appears in metadata — `npx @insforge/cli metadata --json` shows `profiles` in tables.

- [ ] **Step 3: No commit**

Do not commit (per Global Constraints).

---

### Task 2: Dark mode foundation — semantic tokens + FOUC script + ThemeToggle

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/theme-toggle.tsx`

**Interfaces:**
- Consumes: nothing
- Produces:
  - Tailwind color utilities `bg-surface`, `bg-paper`, `text-ink`, `text-stone`, `border-line`, `bg-surface-muted` available app-wide.
  - `.dark` class on `<html>` toggled by `ThemeToggle`.
  - `<ThemeToggle />` client component (exported from `@/components/theme-toggle`).

- [ ] **Step 1: Rewrite `globals.css` with semantic tokens**

```css
@import "tailwindcss";

:root {
  --surface: #ffffff;
  --surface-muted: #f3f1ec;
  --paper: #f7f6f3;
  --ink: #201e1b;
  --stone: #8b887f;
  --line: #e3e0d6;
}

.dark {
  --surface: #1f1d19;
  --surface-muted: #26231f;
  --paper: #16150f;
  --ink: #f2efe9;
  --stone: #a39f93;
  --line: #3a362e;
}

@theme inline {
  --color-background: var(--paper);
  --color-foreground: var(--ink);
  --font-sans: var(--font-jakarta);
  --font-mono: var(--font-mono);

  /* Brand / primary (fixed, no theme flip) */
  --color-trailblaze: #ff7a33;
  --color-moss: #1f7a5c;
  --color-denim: #2e6e8e;
  --color-ember: #d14343;

  /* Semantic (flip with .dark) */
  --color-paper: var(--paper);
  --color-surface: var(--surface);
  --color-surface-muted: var(--surface-muted);
  --color-ink: var(--ink);
  --color-stone: var(--stone);
  --color-line: var(--line);
}

body {
  background: var(--paper);
  color: var(--ink);
}
```

- [ ] **Step 2: Add FOUC-prevention script + metadata in `layout.tsx`**

Edit `src/app/layout.tsx` — add an inline script to the `<head>` (via `<head>` element, since Next 16 supports `<head>` in root layout) that applies `.dark` from `localStorage` before paint:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${unbounded.variable} ${jakarta.variable} ${plexMono.variable} bg-paper text-ink h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create `src/components/theme-toggle.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Mode terang' : 'Mode gelap'}
      className="rounded-lg p-2 text-stone hover:bg-stone/10"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
```

- [ ] **Step 4: Verify**

Run: `npm run lint` and `npm run build`
Expected: both pass. Manual: run `npm run dev`, open `/sign-in` — toggle script should apply dark class for dark OS.

- [ ] **Step 5: No commit**

---

### Task 3: Color-token sweep — replace hardcoded colors

**Files (modify all matches):**
- `src/app/sign-in/page.tsx`, `src/app/sign-in/code/page.tsx`
- `src/components/nav.tsx`, `src/components/dashboard-list.tsx`, `src/components/streak-trail.tsx`, `src/components/charts.tsx`, `src/components/bulk-import.tsx`, `src/components/application-form.tsx`
- `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/sumber/page.tsx`, `src/app/(app)/akun/page.tsx`, `src/app/(app)/statistik/page.tsx`, `src/app/(app)/lamaran/[id]/page.tsx`
- `src/lib/types.ts` (STATUS_COLORS)

**Interfaces:**
- Consumes: tokens from Task 2
- Produces: all components render correctly in both light and dark

Replacements (exact, app-wide):
- `bg-white` → `bg-surface`
- `bg-stone/5`, `bg-stone/10`, `bg-stone/20` → keep `bg-stone/N` (stone token now flips) — no change needed
- `border-stone/30` → `border-line` (borders flip)
- `border-stone/40` → `border-line`
- `border-stone/20`, `border-stone/10`, `divide-stone/20` → `border-line` / `divide-line` (low-emphasis)
- `text-ink`, `text-stone`, `bg-paper` → keep as-is (tokens now flip)

- [ ] **Step 1: Apply replacements**

For each file listed, apply the exact string replacements above. Use `border-line` for borders, `bg-surface` for cards/inputs, `divide-line` for dividers. Keep brand colors (`trailblaze`, `moss`, `denim`, `ember`) untouched.

The `STATUS_COLORS` in `src/lib/types.ts` keep `bg-denim/15 text-denim`, `bg-moss/15 text-moss`, `bg-ember/15 text-ember`, `bg-stone/20 text-stone` — these work in both themes as-is.

- [ ] **Step 2: Verify**

Run: `npm run lint` and `npm run build`
Expected: both pass. Manual: toggle dark mode — all pages legible, no leftover white cards on dark.

- [ ] **Step 3: No commit**

---

### Task 4: Collapsible sidebar + logout + 2-tone wordmark + Lamaran item

**Files:**
- Rewrite: `src/components/nav.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` from Task 2; `signOut` from `@/app/auth-actions`; `usePathname` from `next/navigation`
- Produces:
  - `Nav` renders: desktop `<aside>` (collapsible via button, width via CSS var), mobile bottom bar (5 items incl. Lamaran), logout button at sidebar bottom.
  - Layout padding: `md:pl-[var(--nav-w)]` where `--nav-w` is `13rem` (open) or `4.5rem` (collapsed), set on `<html>` via `data-nav`.

- [ ] **Step 1: Rewrite `src/components/nav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Briefcase, Tags, BarChart3, User, ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react'
import { signOut } from '@/app/auth-actions'
import { ThemeToggle } from '@/components/theme-toggle'

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/lamaran', label: 'Lamaran', icon: Briefcase },
  { href: '/sumber', label: 'Sumber', icon: Tags },
  { href: '/statistik', label: 'Statistik', icon: BarChart3 },
  { href: '/akun', label: 'Akun', icon: User },
]

export function Nav() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('nav-collapsed') === '1'
    setCollapsed(saved)
    document.documentElement.dataset.nav = saved ? 'collapsed' : 'open'
  }, [])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('nav-collapsed', next ? '1' : '0')
    document.documentElement.dataset.nav = next ? 'collapsed' : 'open'
  }

  const isActive = (href: string) => (href === '/lamaran' ? pathname.startsWith('/lamaran') : pathname.startsWith(href))

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper md:hidden">
        <div className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  active ? 'text-trailblaze' : 'text-stone'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside
        className={`fixed left-0 top-0 hidden h-dvh flex-col border-r border-line bg-paper transition-[width] duration-200 md:flex ${
          collapsed ? 'w-[4.5rem]' : 'w-[13rem]'
        }`}
      >
        {/* Wordmark */}
        <div className={`flex items-center gap-2 px-3 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
          <span className="h-3 w-3 shrink-0 rounded-full bg-trailblaze" />
          {!collapsed && (
            <span className="font-display text-xl font-extrabold leading-none tracking-tight">
              <span className="text-trailblaze">Lamar</span>
              <span className="text-ink">anku</span>
            </span>
          )}
        </div>

        {/* Items */}
        <div className="mt-2 flex flex-col gap-1 px-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  collapsed ? 'justify-center px-0' : ''
                } ${active ? 'bg-trailblaze/10 text-trailblaze' : 'text-stone hover:bg-stone/10'}`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && label}
              </Link>
            )
          })}
        </div>

        {/* Bottom: collapse + theme + logout */}
        <div className="mt-auto flex flex-col gap-1 px-2 pb-4">
          <div className={`flex items-center gap-1 ${collapsed ? 'flex-col' : 'justify-between'}`}>
            <ThemeToggle />
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
              className="rounded-lg p-2 text-stone hover:bg-stone/10"
            >
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title={collapsed ? 'Keluar' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ember hover:bg-ember/10 ${
                collapsed ? 'justify-center px-0' : ''
              }`}
            >
              <LogOut size={18} className="shrink-0" />
              {!collapsed && 'Keluar'}
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Update `src/app/(app)/layout.tsx` padding**

```tsx
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  return (
    <div className="mx-auto w-full max-w-5xl pb-20 md:pb-0">
      <div className="md:pl-[var(--nav-w)]">{children}</div>
      <Nav />
    </div>
  )
}
```

- [ ] **Step 3: Define `--nav-w` in `globals.css`**

Append to `globals.css`:

```css
:root {
  --nav-w: 13rem;
}
html[data-nav="collapsed"] {
  --nav-w: 4.5rem;
}
```

- [ ] **Step 4: Verify**

Run: `npm run lint` and `npm run build`
Expected: both pass. Manual: desktop shows 2-tone wordmark, collapse toggles rail width, logout at sidebar bottom; mobile shows 5-item bottom bar.

- [ ] **Step 5: No commit**

---

### Task 5: Reusable `LamaranList` + `/lamaran` page + dashboard recent activity

**Files:**
- Create: `src/components/lamaran-list.tsx`
- Delete: `src/components/dashboard-list.tsx`
- Create: `src/app/(app)/lamaran/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/(app)/lamaran/[id]/actions.ts`

**Interfaces:**
- Consumes: `insforge` (browser client) from `@/lib/browser-client`; `STATUSES`, `STATUS_COLORS`, `ApplicationWithSource`, `Source` from `@/lib/types`; `getSources` from `@/lib/queries` (dashboard); React Query
- Produces:
  - `LamaranList({ variant: 'full' | 'compact', sources, initialItems? })` — exported from `@/components/lamaran-list`
  - `/lamaran` route renders full variant
  - Dashboard renders compact variant with `initialItems`
  - `deleteApplication` redirects to `/lamaran`

- [ ] **Step 1: Create `src/components/lamaran-list.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, CheckSquare, Square, Trash2, MoreHorizontal, Pencil, Eye } from 'lucide-react'
import { insforge } from '@/lib/browser-client'
import { STATUSES, STATUS_COLORS } from '@/lib/types'
import type { ApplicationWithSource, Source } from '@/lib/types'
import { deleteApplication } from '@/app/(app)/lamaran/[id]/actions'

const PAGE_SIZE = 15

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-stone/20 text-stone'}`}>
      {status}
    </span>
  )
}

type Props =
  | { variant: 'full'; sources: Source[] }
  | { variant: 'compact'; sources: Source[]; initialItems: ApplicationWithSource[] }

export function LamaranList(props: Props) {
  if (props.variant === 'compact') {
    const { initialItems } = props
    return (
      <div className="rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-stone">Aktivitas Terbaru</h2>
          <Link href="/lamaran" className="text-sm font-medium text-denim hover:underline">
            Lihat semua
          </Link>
        </div>
        {initialItems.length === 0 ? (
          <p className="p-6 text-center text-sm text-stone">Belum ada lamaran.</p>
        ) : (
          <ul className="divide-y divide-line">
            {initialItems.map((app) => (
              <li key={app.id}>
                <Link href={`/lamaran/${app.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{app.company_name}</p>
                    <p className="truncate text-sm text-stone">{app.role_title}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={app.current_status} />
                    <span className="text-xs text-stone">
                      {new Date(app.applied_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const { sources } = props
  return <FullList sources={sources} />
}

function FullList({ sources }: { sources: Source[] }) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // ponytail: simple debounce via timeout
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | undefined>()
  function onSearch(v: string) {
    setSearch(v)
    clearTimeout(timer)
    setTimer(setTimeout(() => { setDebounced(v); setPage(0) }, 350))
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['applications', debounced, status, source, page],
    queryFn: async () => {
      let q = insforge.database.from('job_applications').select('*, sources(name)', { count: 'exact' }).order('applied_date', { ascending: false })
      if (debounced) {
        q = q.or(`company_name.ilike.%${debounced}%,role_title.ilike.%${debounced}%`)
      }
      if (status) q = q.eq('current_status', status)
      if (source) q = q.eq('source_id', source)
      q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      const res = await q
      return { items: (res.data ?? []) as ApplicationWithSource[], count: res.count ?? 0 }
    },
  })

  const items = data?.items ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkDelete() {
    if (selected.size === 0) return
    if (!window.confirm(`Hapus ${selected.size} lamaran terpilih?`)) return
    await insforge.database.from('job_applications').delete().in('id', [...selected])
    setSelected(new Set())
    refetch()
  }

  // ponytail: single shared status-update menu for bulk rows
  async function bulkStatus(s: string) {
    if (selected.size === 0) return
    await insforge.database.from('job_applications').update({ current_status: s }).in('id', [...selected])
    setSelected(new Set())
    refetch()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari perusahaan / role..."
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-trailblaze"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} className="rounded-lg border border-line bg-surface px-2 py-2 text-sm">
          <option value="">Status</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(0) }} className="rounded-lg border border-line bg-surface px-2 py-2 text-sm">
          <option value="">Sumber</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-denim/10 p-2 text-sm">
          <span className="px-1 font-medium text-denim">{selected.size} dipilih</span>
          <button onClick={bulkDelete} className="inline-flex items-center gap-1 rounded-md bg-ember px-2 py-1 text-white"><Trash2 size={14} /> Hapus</button>
          <select onChange={(e) => e.target.value && bulkStatus(e.target.value)} defaultValue="" className="rounded-md border border-line bg-surface px-2 py-1 text-sm">
            <option value="">Ubah status...</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10 text-stone"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <p className="font-display text-lg font-bold text-ink">Belum ada lamaran</p>
          <p className="mt-1 text-sm text-stone">Mulai catat lamaran pertamamu, atau ubah pencarian.</p>
          <Link href="/lamaran/baru" className="mt-4 inline-block rounded-lg bg-trailblaze px-4 py-2 text-sm font-semibold text-white">
            Tambah lamaran
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="divide-y divide-line md:hidden">
            {items.map((app) => (
              <li key={app.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                <button onClick={() => toggleSelect(app.id)} className="text-stone">
                  {selected.has(app.id) ? <CheckSquare size={18} className="text-trailblaze" /> : <Square size={18} />}
                </button>
                <Link href={`/lamaran/${app.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{app.company_name}</p>
                  <p className="truncate text-sm text-stone">{app.role_title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-stone">
                    <StatusBadge status={app.current_status} />
                    <span>{app.sources?.name}</span>
                    <span>{new Date(app.applied_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </Link>
                <RowActions appId={app.id} open={openMenu === app.id} onToggle={() => setOpenMenu(openMenu === app.id ? null : app.id)} />
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-stone">
                  <th className="p-3" />
                  <th className="p-3">Perusahaan</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Sumber</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((app) => (
                  <tr key={app.id} className="border-b border-line last:border-0 hover:bg-stone/5">
                    <td className="p-3">
                      <button onClick={() => toggleSelect(app.id)} className="text-stone">
                        {selected.has(app.id) ? <CheckSquare size={16} className="text-trailblaze" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-ink">
                      <Link href={`/lamaran/${app.id}`} className="hover:underline">{app.company_name}</Link>
                    </td>
                    <td className="p-3 text-stone">{app.role_title}</td>
                    <td className="p-3 text-stone">{app.sources?.name}</td>
                    <td className="p-3 font-mono text-stone">{app.applied_date}</td>
                    <td className="p-3"><StatusBadge status={app.current_status} /></td>
                    <td className="p-3">
                      <RowActions appId={app.id} open={openMenu === app.id} onToggle={() => setOpenMenu(openMenu === app.id ? null : app.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="text-stone">Hal {page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RowActions({ appId, open, onToggle }: { appId: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <button onClick={onToggle} aria-label="Tindakan" className="rounded-lg p-2 text-stone hover:bg-stone/10">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-line bg-surface p-1 shadow-lg">
            <Link href={`/lamaran/${appId}`} onClick={onToggle} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-stone/10">
              <Eye size={14} /> Lihat
            </Link>
            <Link href={`/lamaran/${appId}/edit`} onClick={onToggle} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-stone/10">
              <Pencil size={14} /> Edit
            </Link>
            <form
              action={deleteApplication}
              onClick={onToggle}
              onSubmit={(e) => { if (!window.confirm('Hapus lamaran ini? Tindakan tidak bisa dibatalkan.')) e.preventDefault() }}
            >
              <input type="hidden" name="id" value={appId} />
              <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ember hover:bg-ember/10">
                <Trash2 size={14} /> Hapus
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Delete `src/components/dashboard-list.tsx`**

`Remove-Item -LiteralPath "src\components\dashboard-list.tsx"` (via shell).

- [ ] **Step 3: Update `src/app/(app)/lamaran/[id]/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { serverDb } from '@/lib/server-db'

export async function deleteApplication(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await (await serverDb())
    .from('job_applications')
    .delete()
    .eq('id', id)
  revalidatePath('/lamaran')
  revalidatePath('/dashboard')
  redirect('/lamaran')
}
```

- [ ] **Step 4: Create `src/app/(app)/lamaran/page.tsx`**

```tsx
import Link from 'next/link'
import { Plus, FileUp } from 'lucide-react'
import { LamaranList } from '@/components/lamaran-list'
import { getSources } from '@/lib/queries'

export default async function LamaranPage() {
  const sources = await getSources()

  return (
    <main className="p-4">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Lamaran</h1>
        <div className="flex gap-2">
          <Link href="/lamaran/import" className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-stone/10">
            <FileUp size={16} /> Impor
          </Link>
          <Link href="/lamaran/baru" className="inline-flex items-center gap-1 rounded-lg bg-trailblaze px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus size={16} /> Tambah
          </Link>
        </div>
      </header>
      <LamaranList variant="full" sources={sources} />
    </main>
  )
}
```

- [ ] **Step 5: Update `src/app/(app)/dashboard/page.tsx`**

Replace the `DashboardList` block with the compact variant. Fetch recent 5 server-side:

```tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, FileUp } from 'lucide-react'
import { serverDb } from '@/lib/server-db'
import { calcStreak } from '@/lib/streak'
import { getSources } from '@/lib/queries'
import { StreakTrail } from '@/components/streak-trail'
import { LamaranList } from '@/components/lamaran-list'
import type { ApplicationWithSource } from '@/lib/types'

export default async function DashboardPage() {
  const insforge = await serverDb()
  const sources = await getSources()

  const [datesRes, totalRes, todayRes, followRes, interviewRes, recentRes] = await Promise.all([
    insforge.from('job_applications').select('applied_date').order('applied_date', { ascending: false }).limit(90),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).eq('applied_date', new Date().toISOString().slice(0, 10)),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).not('next_follow_up_date', 'is', null).lte('next_follow_up_date', cutoff()),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).not('interview_scheduled_at', 'is', null).lte('interview_scheduled_at', new Date(Date.now() + 2 * 86400000).toISOString()),
    insforge.from('job_applications').select('*, sources(name)').order('applied_date', { ascending: false }).limit(5),
  ])

  const dates = datesRes.data?.map((d: { applied_date: string }) => d.applied_date) ?? []
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = todayRes.count ?? dates.filter((d) => d.slice(0, 10) === today).length
  const streak = calcStreak(dates)
  const total = totalRes.count ?? dates.length
  const followup = (followRes.count ?? 0) + (interviewRes.count ?? 0)
  const recent = (recentRes.data ?? []) as ApplicationWithSource[]

  return (
    <main className="p-4">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Lamaranku</h1>
        <div className="flex gap-2">
          <Link href="/lamaran/import" className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-stone/10">
            <FileUp size={16} /> Impor
          </Link>
          <Link href="/lamaran/baru" className="inline-flex items-center gap-1 rounded-lg bg-trailblaze px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus size={16} /> Tambah
          </Link>
        </div>
      </header>

      <StreakTrail streak={streak} dates={dates} todayCount={todayCount} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-stone">Total lamaran</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{total}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-stone">Perlu ditindaklanjuti</p>
          <p className="mt-1 font-display text-3xl font-bold text-moss">{followup}</p>
        </div>
      </div>

      <div className="mt-5">
        <LamaranList variant="compact" sources={sources} initialItems={recent} />
      </div>
    </main>
  )
}

function cutoff() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 6: Update `src/app/(app)/lamaran/[id]/page.tsx` "Kembali" link**

Change the back link from `/dashboard` to `/lamaran` (two places: top-left back link only).

- [ ] **Step 7: Verify**

Run: `npm run lint` and `npm run build`
Expected: both pass. Manual: `/lamaran` lists with search/filter/pagination/three-dots; dashboard shows "Aktivitas Terbaru" card linking to `/lamaran`.

- [ ] **Step 8: No commit**

---

### Task 6: Sumber edit via centered modal

**Files:**
- Create: `src/components/modal.tsx`
- Create: `src/app/(app)/sumber/edit-dialog.tsx`
- Modify: `src/app/(app)/sumber/page.tsx`

**Interfaces:**
- Consumes: `updateSource` from `@/app/(app)/sumber/actions`; `Source` from `@/lib/types`
- Produces:
  - `Modal({ open, onClose, title, children })` exported from `@/components/modal`
  - `EditSourceDialog({ source, open, onClose })` exported from `@/app/(app)/sumber/edit-dialog`

- [ ] **Step 1: Create `src/components/modal.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-stone hover:bg-stone/10">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/(app)/sumber/edit-dialog.tsx`**

```tsx
'use client'

import { Modal } from '@/components/modal'
import { updateSource } from './actions'
import type { Source } from '@/lib/types'

export function EditSourceDialog({ source, open, onClose }: { source: Source | null; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Edit sumber">
      <form
        action={updateSource}
        onSubmit={onClose}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="id" value={source?.id ?? ''} />
        <input
          name="name"
          defaultValue={source?.name}
          required
          placeholder="Nama sumber"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-trailblaze"
        />
        <button type="submit" className="rounded-lg bg-trailblaze px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
          Simpan
        </button>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 3: Create `src/app/(app)/sumber/sources-client.tsx`**

The client component owns the add form, the list with edit/delete actions, and the modal state. It takes `sources` as a prop from the server page.

```tsx
'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { Source } from '@/lib/types'
import { createSource, deleteSource } from './actions'
import { EditSourceDialog } from './edit-dialog'

const inputCls = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-trailblaze'

export function SourcesClient({ sources }: { sources: Source[] }) {
  const [editing, setEditing] = useState<Source | null>(null)

  return (
    <main className="p-4">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">Sumber Lamaran</h1>
        <p className="text-sm text-stone">Sumber tempat kamu menemukan lowongan.</p>
      </header>

      <div className="mb-6 rounded-xl border border-line bg-surface p-4">
        <p className="mb-2 text-sm font-semibold text-ink">Tambah sumber baru</p>
        <form action={createSource} className="flex items-center gap-2">
          <input name="name" required placeholder="Nama sumber" className={inputCls} />
          <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-trailblaze px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus size={16} /> Tambah
          </button>
        </form>
      </div>

      {sources.length === 0 ? (
        <p className="text-sm text-stone">Belum ada sumber. Tambahkan yang pertama.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-medium text-ink">{s.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing(s)} className="rounded-lg p-2 text-stone hover:bg-stone/10" aria-label="Edit">
                  <Pencil size={16} />
                </button>
                <form action={deleteSource}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="rounded-lg p-2 text-ember hover:bg-ember/10" title="Hapus (tidak bisa hapus sumber yang masih dipakai)">
                    <Trash2 size={16} />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <EditSourceDialog source={editing} open={editing !== null} onClose={() => setEditing(null)} />
    </main>
  )
}
```

- [ ] **Step 4: Rewrite `src/app/(app)/sumber/page.tsx` as a thin server page**

The old page was a server component with an inline `<details>` edit. Now the server page only fetches sources and renders the client component. Note: the old `err` query-param redirect from `deleteSource` is dropped (the delete lives inside a client form now); `deleteSource` in `actions.ts` keeps its redirect.

```tsx
import { serverDb } from '@/lib/server-db'
import { SourcesClient } from './sources-client'
import type { Source } from '@/lib/types'

export default async function SourcesPage() {
  const { data } = await (await serverDb()).from('sources').select('id, name').order('name')
  return <SourcesClient sources={(data ?? []) as Source[]} />
}
```

- [ ] **Step 5: Verify**

Run: `npm run lint` and `npm run build`
Expected: both pass. Manual: edit a source opens centered modal, save updates, mobile view modal fits width.

- [ ] **Step 6: No commit**

---

### Task 7: Akun page — profiles table read/write + mobile logout

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/app/(app)/akun/actions.ts`
- Modify: `src/app/(app)/akun/page.tsx`

**Interfaces:**
- Consumes: `serverDb` from `@/lib/server-db`; `getCurrentUser` from `@/lib/server-user`; `Profile` type from `@/lib/types`
- Produces:
  - `Profile` type exported from `@/lib/types`
  - `updateProfile(formData)` server action from `@/app/(app)/akun/actions`
  - Akun page renders profile form (client component `ProfileForm`)

- [ ] **Step 1: Add `Profile` type to `src/lib/types.ts`**

```ts
export type Profile = {
  id: string
  full_name?: string | null
  target_role?: string | null
  linkedin_url?: string | null
  portfolio_url?: string | null
  salary_expectation?: number | null
  phone?: string | null
  updated_at?: string | null
}
```

- [ ] **Step 2: Create `src/app/(app)/akun/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { serverDb } from '@/lib/server-db'
import { getCurrentUser } from '@/lib/server-user'

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) return

  const payload = {
    full_name: (formData.get('full_name') as string | null) || null,
    target_role: (formData.get('target_role') as string | null) || null,
    linkedin_url: (formData.get('linkedin_url') as string | null) || null,
    portfolio_url: (formData.get('portfolio_url') as string | null) || null,
    salary_expectation: formData.get('salary_expectation') ? Number(formData.get('salary_expectation')) : null,
  }

  await (await serverDb()).from('profiles').upsert({ id: user.id, ...payload }, { onConflict: 'id' })
  revalidatePath('/akun')
}
```

- [ ] **Step 3: Rewrite `src/app/(app)/akun/page.tsx`**

Server page:

```tsx
import { getCurrentUser } from '@/lib/server-user'
import { serverDb } from '@/lib/server-db'
import { ProfileForm } from './profile-form'
import type { Profile } from '@/lib/types'

export default async function AccountPage() {
  const user = await getCurrentUser()

  const { data } = await (await serverDb()).from('profiles').select('*').eq('id', user?.id).maybeSingle()
  const profile = (data ?? null) as Profile | null

  return (
    <main className="p-4">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">Akun</h1>
      </header>
      <ProfileForm user={user} profile={profile} />
    </main>
  )
}
```

Client form component `src/app/(app)/akun/profile-form.tsx`:

```tsx
'use client'

import { useFormStatus } from 'react-dom'
import { updateProfile } from './actions'
import { signOut } from '@/app/auth-actions'
import type { UserSchema } from '@insforge/shared-schemas'
import type { Profile } from '@/lib/types'

const inputCls = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-trailblaze'
const labelCls = 'mb-1 block text-sm font-medium text-ink'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-trailblaze px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Menyimpan...' : 'Simpan profil'}
    </button>
  )
}

export function ProfileForm({ user, profile }: { user: UserSchema | null; profile: Profile | null }) {
  const initial = user?.profile?.name ?? profile?.full_name ?? ''
  const initialChar = (initial || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-trailblaze/15 font-display text-2xl font-bold text-trailblaze">
            {initialChar}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-ink">{initial || '—'}</p>
            <p className="truncate text-sm text-stone">{user?.email}</p>
          </div>
        </div>
      </section>

      <form action={updateProfile} className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-stone">Profil</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelCls}>Nama lengkap</span>
            <input name="full_name" defaultValue={profile?.full_name ?? ''} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Role yang dicari</span>
            <input name="target_role" defaultValue={profile?.target_role ?? ''} className={inputCls} placeholder="cth. Frontend Developer" />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>LinkedIn URL</span>
            <input type="url" name="linkedin_url" defaultValue={profile?.linkedin_url ?? ''} className={inputCls} placeholder="https://linkedin.com/in/..." />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Portfolio URL</span>
            <input type="url" name="portfolio_url" defaultValue={profile?.portfolio_url ?? ''} className={inputCls} placeholder="https://..." />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Target gaji</span>
            <input type="number" name="salary_expectation" defaultValue={profile?.salary_expectation ?? ''} className={inputCls} placeholder="cth. 12000000" />
          </label>
        </div>
        <div className="mt-4">
          <SubmitButton />
        </div>
      </form>

      {/* Logout: desktop via sidebar; mobile only here */}
      <form action={signOut} className="md:hidden">
        <button type="submit" className="w-full rounded-lg bg-ember px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          Keluar
        </button>
      </form>
    </div>
  )
}
```

Note: `UserSchema` is re-exported from `@insforge/sdk` (verified in `dist/index.d.ts` line 5). Import as `import type { UserSchema } from '@insforge/sdk'`. Do NOT import from `@insforge/shared-schemas` (transitive dep).

- [ ] **Step 4: Verify**

Run: `npm run lint` and `npm run build`
Expected: both pass. Manual: edit profile saves to `profiles` (check InsForge dashboard / metadata), name shows in header, mobile has logout.

- [ ] **Step 5: No commit**

---

### Task 8: Autosize textarea for job description & notes

**Files:**
- Modify: `src/components/application-form.tsx`

**Interfaces:**
- Consumes: existing form internals
- Produces: `AutosizeTextarea` local component; `job_description` and `notes` fields use it

- [ ] **Step 1: Add `AutosizeTextarea` to `application-form.tsx`**

Add after `labelCls`:

```tsx
function AutosizeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function resize() {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`
  }

  useEffect(() => {
    resize()
  }, [])

  return <textarea {...props} ref={ref} onInput={resize} className={inputCls} />
}
```

Add `useRef` to the existing `useEffect, useState` import from `react`.

- [ ] **Step 2: Replace the two textareas**

`job_description`:

```tsx
<AutosizeTextarea name="job_description" defaultValue={initial?.job_description ?? ''} placeholder="Tempel deskripsi pekerjaan di sini..." />
```

`notes`:

```tsx
<AutosizeTextarea name="notes" defaultValue={initial?.notes ?? ''} />
```

Remove the old `<textarea rows={4} name="job_description" ...>` and `<textarea rows={3} name="notes" ...>`.

- [ ] **Step 3: Verify**

Run: `npm run lint` and `npm run build`
Expected: both pass. Manual: form shows growing textarea for long pasted text, capped height with scroll.

- [ ] **Step 4: No commit**

---

### Task 9: Full verification

- [ ] **Step 1: Lint + build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 2: Manual smoke test**

With `npm run dev` and InsForge SQL migration applied:
1. OTP login works.
2. `/lamaran`: search, status/source filter, three-dots (Lihat/Edit/Hapus), pagination (15/page), date desc.
3. Dashboard: streak + stat cards + "Aktivitas Terbaru" (5 items) → "Lihat semua" → `/lamaran`.
4. Sumber: add works; edit opens centered modal; delete works.
5. Akun: edit profile saves to `profiles`; header shows name; mobile shows logout.
6. Dark mode: follows system default, toggle overrides, persists across reload (no flash).
7. Sidebar: collapse to rail on desktop, 2-tone wordmark, logout at bottom; mobile 5-item bottom bar.
8. Long job description autosizes.

- [ ] **Step 3: RLS verification**

In InsForge dashboard / via anon key, confirm `profiles` and `job_applications` only return rows for the authenticated user. The existing RLS patterns cover it; the new `profiles` policy mirrors them.

- [ ] **Step 4: No commit**

---

### Task 10: Redeploy to production

**Files:**
- None (ops)

- [ ] **Step 1: Redeploy**

Run: `npx @insforge/cli deployments deploy`
Expected: "Deployment complete", live at `https://lacakkerja.insforge.site`.

- [ ] **Step 2: Post-deploy smoke**

Verify `/sign-in` returns 200 and `/dashboard` redirects (307) unauthenticated.

- [ ] **Step 3: No commit**

---

## Self-Review Notes

- **Spec coverage:** profiles table (Task 1), dark mode (Task 2+3), sidebar collapse+wordmark+logout (Task 4), Lamaran menu+full list+three-dots+pagination (Task 5), dashboard recent activity (Task 5), Sumber modal (Task 6), Akun fields (Task 7), autosize textarea (Task 8). All sections covered.
- **Type consistency:** `LamaranList` props variant union matches usage in `/lamaran` and dashboard. `StatusBadge` reused. `Profile` type matches `profiles` columns. `deleteApplication` signature unchanged (`formData`), redirect updated to `/lamaran`.
- **Security:** no service-role key; profiles RLS mirrors sources; server actions validate via `getCurrentUser()`; upsert pinned to `onConflict: 'id'`.
- **No placeholders:** all code inline.

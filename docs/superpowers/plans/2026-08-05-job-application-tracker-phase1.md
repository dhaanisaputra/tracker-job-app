# Job Application Tracker - Phase 1 MVP Implementation Plan

> **For agentic workers**: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first job application tracker with CRUD operations, duplicate detection, status tracking, and analytics dashboard.

**Architecture:** Next.js App Router with InsForge backend (PostgreSQL + Auth). Server-side pagination, TanStack Query for caching, Tailwind CSS + shadcn/ui for styling.

**Tech Stack:** Next.js 15, React Server Components, TanStack Query, TanStack Table, Chart.js, Tailwind CSS, shadcn/ui, @insforge/sdk, SheetJS (xlsx), papaparse

## Global Constraints

- Single-tenant, personal use only
- Mobile-first design, desktop responsive
- $0/month cost target (free tier InsForge)
- Row Level Security (RLS) enabled on all tables
- Public/anon key only in client bundle
- Service/secret key in Edge Functions only

---

### Task 1: Initialize Next.js Project with InsForge SDK

**Files:**
- Create: `lib/insforge.ts`
- Create: `lib/env.ts`
- Create: `.env.local` (NEXT_PUBLIC_INSFORGE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY, NEXT_PUBLIC_SITE_URL)
- Create: `app/layout.tsx`
- Create: `providers/query-client-provider.tsx`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`

**Interfaces:**
- Consumes: None
- Produces: InsForge client instance configured for the project

- [ ] **Step 1: Install dependencies and initialize project**

```bash
cd D:\Project-Study\Tracker Job App\tracker-job-app
npm create next-app@latest . -- --typescript --tailwind --eslint --src-dir --app --import-alias="@/"
npm install @insforge/sdk @tanstack/react-query @tanstack/react-table chart.js react-chartjs-2 xlsx papaparse clsx tailwind-merge lucide-react
```

- [ ] **Step 2: Create environment file .env.local**

```
NEXT_PUBLIC_INSFORGE_URL=https://5fr37au2.ap-southeast.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=ik_86ee232cd8bb3128bf814404e1c9b2e7
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: Create InsForge client lib/insforge.ts**

```typescript
import { createClient } from '@insforge/sdk'

const url = process.env.NEXT_PUBLIC_INSFORGE_URL
const key = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

if (!url || !key) {
  throw new Error('InsForge URL and ANON_KEY must be set in environment')
}

export const insforge = createClient({
  baseUrl: url,
  anonKey: key,
})
```

- [ ] **Step 4: Create QueryClientProvider**

```typescript
// providers/query-client-provider.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRef } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<QueryClient | null>(null)
  if (!clientRef.current) {
    clientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          retry: 3,
        },
      },
    })
  }
  return <QueryClientProvider client={clientRef.current}>{children}</QueryClientProvider>
}
```

- [ ] **Step 5: Update app/layout.tsx with providers**

```typescript
// src/app/layout.tsx
import './globals.css'
import { QueryProvider } from '@/providers/query-client-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  title: 'Job Application Tracker',
  description: 'Track your job applications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}
```

---

### Task 2: Magic Link Authentication

**Files:**
- Create: `app/sign-in/action.ts`
- Create: `app/sign-in/page.tsx`
- Create: `components/auth-gate.tsx`
- Create: `hooks/use-user.ts`

**Interfaces:**
- Consumes: Form input (email)
- Produces: Magic link sent, user session hydrated

- [ ] **Step 1: Create sign-in Action**

```typescript
// app/sign-in/action.ts
'use server'
import { insforge } from '@/lib/insforge'
import { redirect } from 'next/navigation'

export async function sendMagicLink(email: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { error, data } = await insforge.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/dashboard` }
  })
  if (error) return { error: error.message }
  return { error: null, message: 'Magic link sent to your email' }
}
```

- [ ] **Step 2: Create sign-in page**

```typescript
// app/sign-in/page.tsx
import { sendMagicLink } from './action'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await sendMagicLink(email)
    setMessage(result.error || result.message)
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" className="w-full">Send Magic Link</Button>
        {message && <p className="text-center text-sm">{message}</p>}
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Create auth-gate component**

```typescript
// components/auth-gate.tsx
'use client'
import { useUser } from '@/hooks/use-user'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in')
    }
  }, [user, loading, router])

  if (loading) return <div>Loading...</div>
  if (!user) return null
  
  return <>{children}</>
}
```

- [ ] **Step 4: Create use-user hook**

```typescript
// hooks/use-user.ts
'use client'
import { useEffect, useState } from 'react'
import { insforge } from '@/lib/insforge'

export function useUser() {
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { user: currentUser } } = insforge.auth.getUser()
    if (currentUser) {
      setUser({ email: currentUser.email })
    }
    setLoading(false)
  }, [])

  return { user, loading }
}
```

---

### Task 3: Database Schema Setup

**Files:**
- Run SQL in InsForge dashboard (schema from PRD section 8)
- OR create: `sql/schema.sql` (for reference)

Apply the DDL from PRD section 8, replacing `uid()` with InsForge's auth helper.

---

### Task 4: Sources Management (CRUD)

**Files:**
- Create: `hooks/use-sources.ts`
- Create: `components/sources-table.tsx`
- Create: `components/source-form.tsx`
- Create: `app/sources/page.tsx`

**Interfaces:**
- Consumes: Source data (name)
- Produces: List of sources, create/edit/delete operations

---

### Task 5: Job Applications CRUD + Duplicate Detection

**Files:**
- Create: `hooks/use-applications.ts`
- Create: `lib/duplicate-checker.ts`
- Create: `components/applications-table.tsx`
- Create: `components/application-form.tsx`
- Create: `app/applications/page.tsx`
- Create: `app/applications/[id]/page.tsx`
- Create: `app/applications/new/page.tsx`
- Create: `app/applications/edit/[id]/page.tsx`

---

### Task 6: Dashboard (Mobile-First)

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `components/streak-trail.tsx`
- Create: `components/stats-cards.tsx`
- Create: `components/applications-filters.tsx`
- Create: `components/mobile-application-card.tsx`
- Create: `components/summary-actions.tsx`

---

### Task 7: Status Timeline & Detail View

**Files:**
- Create: `components/status-timeline.tsx`
- Enhance: `app/applications/[id]/page.tsx`

---

### Task 8: Analytics Dashboard + Edge Function

**Files:**
- Create: `functions/dashboard-stats/index.ts`
- Create: `app/stats/page.tsx`
- Create: `components/growth-chart.tsx`
- Create: `components/success-rate-bar.tsx`
- Create: `components/source-distribution-donut.tsx`

---

### Task 9: Bulk Import

**Files:**
- Create: `components/bulk-import-dialog.tsx`
- Create: `app/applications/import/page.tsx`

---

### Task 10: Deploy to InsForge

- Push commit to main branch
- Configure build in InsForge Site Deployment
- Set environment variables in InsForge dashboard

---

## Execution Choice

**Plan complete and saved to `docs/superpowers/plans/2026-08-05-job-application-tracker-phase1.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
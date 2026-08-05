import { serverDb } from '@/lib/server-db'

// ponytail: aggregation in JS, not a deployed Edge Function; same queries as PRD 8.1
export async function getDashboardStats() {
  const db = await serverDb()

  const [datesRes, statusRes] = await Promise.all([
    db.from('job_applications').select('applied_date, sources(name)'),
    db.from('application_status_history').select('status, application_id'),
  ])

  // Growth: weekly counts, last 8 weeks
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7 * 8)
  const weekCounts = new Map<string, number>()
  for (const a of datesRes.data ?? []) {
    const d = new Date(a.applied_date)
    if (d < cutoff) continue
    const key = startOfWeek(d).toISOString().slice(0, 10)
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1)
  }
  const weeks = [...weekCounts.keys()].sort()
  const growth = {
    labels: weeks,
    values: weeks.map((w) => weekCounts.get(w) ?? 0),
  }

  // Success rate: distinct applications per stage reached (from history)
  const reached = new Map<string, number>()
  const sourceCounts = new Map<string, number>()
  for (const h of statusRes.data ?? []) {
    reached.set(h.status, (reached.get(h.status) ?? 0) + 1)
  }
  // Distribution by source
  for (const a of datesRes.data ?? []) {
    const name = (a as { sources?: { name?: string } | null }).sources?.name
    if (name) sourceCounts.set(name, (sourceCounts.get(name) ?? 0) + 1)
  }
  const total = datesRes.data?.length ?? 1

  const successRate = {
    labels: ['Applied', 'Screening', 'HR Interview', 'Technical Interview', 'Offer', 'Accepted'],
    values: ['Applied', 'Screening', 'HR Interview', 'Technical Interview', 'Offer', 'Accepted'].map(
      (s) => Math.round(((reached.get(s) ?? 0) / total) * 100),
    ),
  }

  const distribution = {
    labels: [...sourceCounts.keys()],
    values: [...sourceCounts.values()],
  }

  return { growth, successRate, distribution }
}

export const dynamic = 'force-dynamic'

function startOfWeek(d: Date) {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7 // Monday
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}
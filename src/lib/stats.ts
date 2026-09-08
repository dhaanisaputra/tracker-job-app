import { serverDb } from '@/lib/server-db'
import { calcStreak } from '@/lib/streak'
import { getServerLang } from '@/lib/server-lang'
import { dateLocale } from '@/lib/i18n'

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
  const lang = await getServerLang()
  const locale = dateLocale(lang)
  const weekPrefix = lang === 'en' ? 'W' : 'M'
  const db = await serverDb()

  const now = new Date()
  const cutoff = range === 'all' ? new Date(0) : new Date(now.getTime() - (range === '7d' ? 7 : 30) * 86400000)

  const [appsRes, historyRes] = await Promise.all([
    db.from('job_applications').select('id, applied_date, current_status, sources(name)'),
    db.from('application_status_history').select('status, application_id'),
  ])

  const apps = (appsRes.data ?? []) as { id: string; applied_date: string; current_status: string; sources?: { name?: string | null } | null }[]
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
    labels.push(range === '7d' ? bucketStart.toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : `${weekPrefix}${buckets - i}`)
    values.push(apps.filter((a) => { const d = new Date(a.applied_date); return d >= bucketStart && d < bucketEnd }).length)
  }

  // funnel: distinct in-range apps that ever reached each stage
  const inRangeIds = new Set(inRange.map((a) => a.id as string))
  const reached = new Map<string, Set<string>>()
  for (const h of (historyRes.data ?? []) as { status: string; application_id: string }[]) {
    if (!inRangeIds.has(h.application_id)) continue
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
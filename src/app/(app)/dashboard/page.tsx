import Link from 'next/link'
import { Plus, FileUp, Send, Bell } from 'lucide-react'
import { serverDb } from '@/lib/server-db'
import { calcStreak } from '@/lib/streak'
import { getSources } from '@/lib/queries'
import { taskState } from '@/lib/task-state'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { StreakTrail } from '@/components/streak-trail'
import { LamaranList } from '@/components/lamaran-list'
import { ThemeToggle } from '@/components/theme-toggle'
import type { ApplicationWithSource } from '@/lib/types'

export default async function DashboardPage() {
  const insforge = await serverDb()
  const sources = await getSources()

  const [datesRes, totalRes, todayRes, followRes, interviewRes, recentRes, taskRes] = await Promise.all([
    insforge.from('job_applications').select('applied_date').order('applied_date', { ascending: false }).limit(90),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).eq('applied_date', new Date().toISOString().slice(0, 10)),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).not('next_follow_up_date', 'is', null).lte('next_follow_up_date', cutoff()),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).not('interview_scheduled_at', 'is', null).lte('interview_scheduled_at', interviewCutoff()),
    insforge.from('job_applications').select('*, sources(name)').order('applied_date', { ascending: false }).limit(5),
    insforge.from('job_applications').select('current_status, task_deadline').eq('current_status', 'Technical Interview').not('task_deadline', 'is', null),
  ])

  const dates = datesRes.data?.map((d: { applied_date: string }) => d.applied_date) ?? []
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = todayRes.count ?? dates.filter((d) => d.slice(0, 10) === today).length
  const streak = calcStreak(dates)
  const total = totalRes.count ?? dates.length
  const pendingTasks = (taskRes.data ?? []).filter(
    (t: { current_status: string; task_deadline: string | null }) =>
      taskState(t.current_status, t.task_deadline).kind !== 'none',
  ).length
  const followup = (followRes.count ?? 0) + (interviewRes.count ?? 0) + pendingTasks
  const recent = (recentRes.data ?? []) as ApplicationWithSource[]

  return (
    <main className="p-4">
      <PageHeader title="Lamaranku" description="Ringkasan aktivitas melamar kamu.">
        <Link href="/lamaran/import" className="btn-secondary">
          <FileUp size={16} /> Impor
        </Link>
        <ThemeToggle />
        <Link href="/lamaran/baru" className="btn-primary">
          <Plus size={16} /> Tambah
        </Link>
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Lamaran" value={String(total)} icon={<Send size={20} />} tone="primary" progress={Math.min(100, total)} />
        <StatCard label="Perlu Tindakan" value={String(followup)} icon={<Bell size={20} />} tone="denim" progress={Math.min(100, followup * 10)} />
      </section>

      <div className="mt-4">
        <StreakTrail streak={streak} dates={dates} todayCount={todayCount} />
        <div className="mt-4">
          <LamaranList variant="compact" sources={sources} initialItems={recent} />
        </div>
      </div>
    </main>
  )
}

function cutoff() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().slice(0, 10)
}

function interviewCutoff() {
  return new Date(Date.now() + 2 * 86400000).toISOString()
}

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, FileUp } from 'lucide-react'
import { serverDb } from '@/lib/server-db'
import { calcStreak } from '@/lib/streak'
import { getSources } from '@/lib/queries'
import { StreakTrail } from '@/components/streak-trail'
import { DashboardList } from '@/components/dashboard-list'

export default async function DashboardPage() {
  const insforge = await serverDb()
  const sources = await getSources()

  const [datesRes, totalRes, todayRes, followRes, interviewRes] = await Promise.all([
    insforge.from('job_applications').select('applied_date').order('applied_date', { ascending: false }).limit(90),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).eq('applied_date', new Date().toISOString().slice(0, 10)),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).not('next_follow_up_date', 'is', null).lte('next_follow_up_date', cutoff()),
    insforge.from('job_applications').select('*', { count: 'exact', head: true }).not('interview_scheduled_at', 'is', null).lte('interview_scheduled_at', new Date(Date.now() + 2 * 86400000).toISOString()),
  ])

  const dates = datesRes.data?.map((d: { applied_date: string }) => d.applied_date) ?? []
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = todayRes.count ?? dates.filter((d) => d.slice(0, 10) === today).length
  const streak = calcStreak(dates)
  const total = totalRes.count ?? dates.length
  const followup = (followRes.count ?? 0) + (interviewRes.count ?? 0)

  return (
    <main className="p-4">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Lamaranku</h1>
        <div className="flex gap-2">
          <Link href="/lamaran/import" className="inline-flex items-center gap-1 rounded-lg border border-stone/40 px-3 py-2 text-sm font-medium hover:bg-stone/10">
            <FileUp size={16} /> Impor
          </Link>
          <Link href="/lamaran/baru" className="inline-flex items-center gap-1 rounded-lg bg-trailblaze px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus size={16} /> Tambah
          </Link>
        </div>
      </header>

      <StreakTrail streak={streak} dates={dates} todayCount={todayCount} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-stone/30 bg-white p-4">
          <p className="text-sm text-stone">Total lamaran</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{total}</p>
        </div>
        <div className="rounded-xl border border-stone/30 bg-white p-4">
          <p className="text-sm text-stone">Perlu ditindaklanjuti</p>
          <p className="mt-1 font-display text-3xl font-bold text-moss">{followup}</p>
        </div>
      </div>

      <div className="mt-5">
        <Suspense fallback={<p className="text-sm text-stone">Memuat daftar...</p>}>
          <DashboardList sources={sources} />
        </Suspense>
      </div>
    </main>
  )
}

function cutoff() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().slice(0, 10)
}
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
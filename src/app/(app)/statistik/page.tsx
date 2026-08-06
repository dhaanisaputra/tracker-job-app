import { getStats } from '@/lib/stats'
import { StatistikClient } from './statistik-client'

export default async function StatistikPage() {
  const stats = await getStats('30d')
  return <StatistikClient initial={stats} />
}

export const dynamic = 'force-dynamic'
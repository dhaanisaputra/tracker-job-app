'use server'

import { getStats } from '@/lib/stats'
import type { StatsRange, Stats } from '@/lib/stats'

export async function fetchStats(range: StatsRange): Promise<Stats> {
  return getStats(range)
}
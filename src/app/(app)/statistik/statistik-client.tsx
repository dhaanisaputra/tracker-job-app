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
import { useLang } from '@/components/language-provider'
import type { Stats } from '@/lib/stats'

export function StatistikClient({ initial }: { initial: Stats }) {
  const { t } = useLang()
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
      <PageHeader title={t('stats.title')} description={t('stats.desc')}>
        <RangeFilter range={range} onChange={setRange} />
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('stats.total')} value={String(s.total)} icon={<Send size={20} />} tone="primary" progress={Math.min(100, s.total)} />
        <StatCard label={t('stats.interviews')} value={String(s.interviews)} icon={<MessagesSquare size={20} />} tone="moss" progress={Math.min(100, s.interviews * 4)} />
        <StatCard label={t('stats.rejected')} value={String(s.rejected)} icon={<XCircle size={20} />} tone="ember" progress={Math.min(100, s.rejected * 4)} />
        <StatCard solid label={t('stats.streak')} value={`${s.streak}`} unit={t('stats.days')} icon={<Flame size={80} fill="currentColor" />} progress={100} />
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
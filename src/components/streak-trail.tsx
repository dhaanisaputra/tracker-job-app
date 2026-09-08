'use client'

import { Flame } from 'lucide-react'
import { useLang } from '@/components/language-provider'
import { dateLocale } from '@/lib/i18n'

export function StreakTrail({ streak, dates, todayCount }: { streak: number; dates: string[]; todayCount: number }) {
  const { t, lang } = useLang()
  const today = new Date().toISOString().slice(0, 10)
  const hasToday = new Set(dates.map((d) => d.slice(0, 10))).has(today)

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Flame size={20} className={streak > 0 ? 'text-amber' : 'text-stone'} fill="currentColor" />
        <span className="text-2xl font-bold text-ink">{streak}</span>
        <span className="text-sm text-stone">{t('dashboard.streakDays')}</span>
        <span className="ml-auto text-xs text-stone">{hasToday ? t('dashboard.today').replace('{n}', String(todayCount)) : t('dashboard.noneToday')}</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {[-6, -5, -4, -3, -2, -1, 0].map((offset) => {
          const d = new Date()
          d.setDate(d.getDate() + offset)
          const iso = d.toISOString().slice(0, 10)
          const filled = dates.some((x) => x.slice(0, 10) === iso)
          return (
            <div key={iso} className="flex flex-col items-center gap-1">
              <span className={`h-2.5 w-full rounded-sm ${filled ? 'bg-amber' : 'bg-surface-sunken'}`} />
              <span className="text-label-xs text-stone">
                {d.toLocaleDateString(dateLocale(lang), { weekday: 'short' }).slice(0, 2)}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-label-xs text-stone">
        {t('dashboard.legend7')} <span className="font-medium text-amber">{t('dashboard.legendOrange')}</span> {t('dashboard.legendRest')}
      </p>
    </div>
  )
}
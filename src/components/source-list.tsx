'use client'

import { useLang } from '@/components/language-provider'

const dotColors = ['#3a5cd9', '#19916c', '#2f7fa8', '#d04444', '#d99a2b', '#5b6478']

export function SourceList({ items }: { items: { name: string; value: number }[] }) {
  const { t } = useLang()
  const total = items.reduce((acc, i) => acc + i.value, 0)
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-ink">{t('stats.sources')}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-stone">{t('stats.noSources')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item, i) => (
            <li key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dotColors[i % dotColors.length] }} />
                <span className="text-sm text-ink">{item.name}</span>
              </div>
              <span className="text-lg font-bold text-ink">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
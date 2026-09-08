'use client'

import { useLang } from '@/components/language-provider'

const stageColors = ['#3a5cd9', '#2f7fa8', '#19916c', '#d99a2b', '#d04444', '#5b6478']

export function Funnel({ labels, values }: { labels: string[]; values: number[] }) {
  const { t } = useLang()
  const max = Math.max(...values, 1)
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-ink">{t('stats.funnel')}</h2>
      <div className="mt-4 flex flex-col justify-center gap-3">
        {labels.map((label, i) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-ink">{label}</span>
              <span className="font-mono text-stone">{values[i]}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-stone/10">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${Math.round((values[i] / max) * 100)}%`, backgroundColor: stageColors[i % stageColors.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
'use client'

import { useLang } from '@/components/language-provider'

export type Range = '7d' | '30d' | 'all'

export function RangeFilter({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  const { t } = useLang()
  const OPTIONS = [
    { value: '7d', label: t('stats.range7') },
    { value: '30d', label: t('stats.range30') },
    { value: 'all', label: t('stats.rangeAll') },
  ] as const
  return (
    <div className="flex gap-1 rounded-md border border-line bg-surface-muted p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            range === o.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-stone hover:bg-surface/60 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

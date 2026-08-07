const OPTIONS = [
  { value: '7d', label: '7 Hari' },
  { value: '30d', label: '30 Hari' },
  { value: 'all', label: 'Semua Waktu' },
] as const

export type Range = (typeof OPTIONS)[number]['value']

export function RangeFilter({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
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

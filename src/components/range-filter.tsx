const OPTIONS = [
  { value: '7d', label: '7 Hari' },
  { value: '30d', label: '30 Hari' },
  { value: 'all', label: 'Semua Waktu' },
] as const

export type Range = (typeof OPTIONS)[number]['value']

export function RangeFilter({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1 text-label-mono transition ${
            range === o.value
              ? 'border-trailblaze bg-trailblaze/10 font-bold text-trailblaze'
              : 'border-line bg-surface text-stone hover:bg-stone/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const fillByTone: Record<string, string> = {
  primary: 'bg-trailblaze',
  moss: 'bg-moss',
  denim: 'bg-denim',
  ember: 'bg-ember',
  amber: 'bg-amber',
  stone: 'bg-stone',
}
const iconTone: Record<string, string> = {
  primary: 'text-trailblaze',
  moss: 'text-moss',
  denim: 'text-denim',
  ember: 'text-ember',
  amber: 'text-amber',
  stone: 'text-stone',
}

export function StatCard({ label, value, unit, icon, tone = 'primary', progress, solid }: {
  label: string
  value: string
  unit?: string
  icon?: React.ReactNode
  tone?: keyof typeof fillByTone
  progress?: number
  solid?: boolean
}) {
  if (solid) {
    return (
      <div className="relative flex h-28 flex-col justify-between overflow-hidden rounded-lg bg-trailblaze p-4 text-white shadow-card">
        {icon && <div className="absolute -right-3 -top-3 opacity-20">{icon}</div>}
        <span className="text-label-xs font-semibold uppercase tracking-wider text-white/80">{label}</span>
        <div className="flex flex-col">
          <span className="text-stat-lg font-bold">{value}{unit && <span className="ml-1 text-base font-medium text-white/85">{unit}</span>}</span>
          <span className="mt-0.5 text-xs text-white/80">Pertahankan!</span>
        </div>
      </div>
    )
  }
  return (
    <div className="card relative flex h-28 flex-col justify-between p-4">
      <div className="flex items-start justify-between">
        <span className="text-label-xs font-semibold uppercase tracking-wider text-stone">{label}</span>
        {icon && <span className={`${iconTone[tone]}`}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-stat-lg font-bold text-ink">{value}</span>
        {unit && <span className="text-label-mono text-stone">{unit}</span>}
      </div>
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-stone/10">
        <div className={`h-full ${fillByTone[tone]}`} style={{ width: `${Math.min(100, progress ?? 0)}%` }} />
      </div>
    </div>
  )
}
const fillByTone: Record<string, string> = {
  primary: 'bg-trailblaze',
  moss: 'bg-moss',
  denim: 'bg-denim',
  ember: 'bg-ember',
  stone: 'bg-stone',
}
const iconTone: Record<string, string> = {
  primary: 'text-trailblaze',
  moss: 'text-moss',
  denim: 'text-denim',
  ember: 'text-ember',
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
      <div className="relative flex h-32 flex-col justify-between overflow-hidden rounded-xl border border-trailblaze bg-trailblaze p-4 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
        {icon && <div className="absolute -right-4 -top-4 opacity-20">{icon}</div>}
        <span className="text-label-mono uppercase tracking-wider text-white/80">{label}</span>
        <div className="flex flex-col">
          <span className="text-stat-lg text-4xl">{value}{unit && <span className="ml-1 text-lg">{unit}</span>}</span>
          <span className="mt-1 text-sm text-white/80">Pertahankan!</span>
        </div>
      </div>
    )
  }
  return (
    <div className="relative flex h-32 flex-col justify-between overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <span className="text-label-mono uppercase tracking-wider text-stone">{label}</span>
        {icon && <span className={iconTone[tone]}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-stat-lg text-4xl text-ink">{value}</span>
        {unit && <span className="text-label-mono text-stone">{unit}</span>}
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-stone/10">
        <div className={`h-full ${fillByTone[tone]}`} style={{ width: `${Math.min(100, progress ?? 0)}%` }} />
      </div>
    </div>
  )
}

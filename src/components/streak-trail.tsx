import { Flame } from 'lucide-react'

export function StreakTrail({ streak, dates, todayCount }: { streak: number; dates: string[]; todayCount: number }) {
  const today = new Date().toISOString().slice(0, 10)
  const hasToday = new Set(dates.map((d) => d.slice(0, 10))).has(today)

  return (
    <div className="rounded-xl border border-stone/30 bg-white p-4">
      <div className="flex items-center gap-2">
        <Flame size={22} className={streak > 0 ? 'text-trailblaze' : 'text-stone'} fill="currentColor" />
        <span className="font-display text-2xl font-bold text-ink">{streak}</span>
        <span className="text-sm text-stone">hari streak</span>
        <span className="ml-auto text-sm text-stone">{hasToday ? `Hari ini: ${todayCount} lamaran` : 'Belum apply hari ini'}</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        {[-6, -5, -4, -3, -2, -1, 0].map((offset) => {
          const d = new Date()
          d.setDate(d.getDate() + offset)
          const iso = d.toISOString().slice(0, 10)
          const filled = dates.some((x) => x.slice(0, 10) === iso)
          return <span key={iso} className={`h-3 w-3 rounded-full ${filled ? 'bg-trailblaze' : 'border border-stone/50'}`} />
        })}
      </div>
    </div>
  )
}
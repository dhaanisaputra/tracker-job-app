export function calcStreak(dates: string[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const set = new Set(dates.map((d) => d.slice(0, 10)))

  // ponytail: streak counts up to today; days with no application break it
  if (!set.has(today.toISOString().slice(0, 10))) return 0

  let streak = 0
  const cursor = new Date(today)
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function last7Days(): string[] {
  const out: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}
import type { Lang } from './i18n'

export type TaskState =
  | { kind: 'none' }
  | { kind: 'warning'; label: string }
  | { kind: 'overdue'; label: string }

const TECHNICAL_INTERVIEW = 'Technical Interview'
const WARN_MS = 3 * 24 * 60 * 60 * 1000

export function taskState(
  currentStatus: string,
  deadline: string | null | undefined,
  now: Date = new Date(),
  lang: Lang = 'id',
): TaskState {
  if (currentStatus !== TECHNICAL_INTERVIEW) return { kind: 'none' }
  if (!deadline) return { kind: 'none' }

  const msLeft = new Date(deadline).getTime() - now.getTime()

  if (msLeft <= 0) {
    const days = Math.abs(Math.ceil(msLeft / 86400000))
    if (lang === 'en') return { kind: 'overdue', label: days <= 0 ? 'Due today' : days === 1 ? 'Task 1 day overdue' : `Task ${days} days overdue` }
    return { kind: 'overdue', label: days <= 0 ? 'Tenggat hari ini' : `Task lewat ${days} hari` }
  }
  if (msLeft <= WARN_MS) {
    const days = Math.ceil(msLeft / 86400000)
    if (lang === 'en') return { kind: 'warning', label: days <= 1 ? 'Task due today' : `Task in ${days} days` }
    return { kind: 'warning', label: days <= 1 ? 'Task hari ini' : `Task ${days} hari lagi` }
  }
  return { kind: 'none' }
}

// ponytail: dev self-check, no framework. Run: npx -y tsx src/lib/task-state.ts
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`task-state self-check failed: ${msg}`)
}

function runSelfCheck() {
  const base = new Date('2026-08-10T12:00:00Z')

  assert(taskState('Technical Interview', null, base).kind === 'none', 'null deadline -> none')
  assert(taskState('HR Interview', '2026-08-11T00:00:00Z', base).kind === 'none', 'non-tech status -> none')
  assert(taskState('Technical Interview', '2026-08-13T00:00:00Z', base).kind === 'warning', '3 days -> warning')
  assert((taskState('Technical Interview', '2026-08-11T00:00:00Z', base, 'id') as { label: string }).label === 'Task hari ini', '1 day label')
  assert(taskState('Technical Interview', '2026-08-10T10:00:00Z', base).kind === 'overdue', 'past -> overdue')
  assert((taskState('Technical Interview', '2026-08-08T00:00:00Z', base, 'id') as { label: string }).label === 'Task lewat 2 hari', 'overdue label')
  assert(taskState('Technical Interview', '2026-08-20T00:00:00Z', base).kind === 'none', 'far future -> none')
  assert((taskState('Technical Interview', '2026-08-11T00:00:00Z', base, 'en') as { label: string }).label === 'Task due today', 'en 1-day warning')
  assert((taskState('Technical Interview', '2026-08-08T00:00:00Z', base, 'en') as { label: string }).label === 'Task 2 days overdue', 'en overdue')

  console.log('task-state self-check: OK')
}

runSelfCheck()

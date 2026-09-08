'use client'

import { AlarmClock } from 'lucide-react'
import { taskState } from '@/lib/task-state'
import { useLang } from '@/components/language-provider'

export function TaskBadge({ currentStatus, deadline }: { currentStatus: string; deadline?: string | null }) {
  const { lang } = useLang()
  const state = taskState(currentStatus, deadline, undefined, lang)
  if (state.kind === 'none') return null

  const cls = state.kind === 'overdue' ? 'bg-ember/15 text-ember' : 'bg-amber/15 text-amber'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-xs font-semibold ${cls}`}>
      <AlarmClock size={12} />
      {state.label}
    </span>
  )
}

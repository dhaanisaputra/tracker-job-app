'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

let listeners: ((msg: string) => void)[] = []

export function toast(msg: string) {
  listeners.forEach((l) => l(msg))
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const onToast = (m: string) => setMsg(m)
    listeners.push(onToast)
    return () => {
      listeners = listeners.filter((l) => l !== onToast)
    }
  }, [])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2500)
    return () => clearTimeout(t)
  }, [msg])

  if (!msg) return null
  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper shadow-lg">
      <span className="inline-flex items-center gap-2">
        <CheckCircle2 size={16} /> {msg}
      </span>
    </div>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function Dropdown({ value, options, onChange, placeholder = 'Pilih' }: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      // panel width matches the trigger; keep on-screen horizontally
      const width = Math.min(r.width, window.innerWidth - 16)
      const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8))
      setPos({ top: r.bottom + 4, left, width })
    }
    if (!open) setPos(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    // close when tapping outside the dropdown (button or panel)
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    // close on scroll/resize so the fixed-positioned panel doesn't stay locked
    const close = () => setOpen(false)
    document.addEventListener('click', onDocClick)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('click', onDocClick)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const current = options.find((o) => o.value === value)?.label

  return (
    <div ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 py-2 text-left text-sm ${value ? 'text-ink' : 'text-stone'}`}
      >
        <span className="truncate">{current ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-stone transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="fixed z-50 overflow-hidden rounded-md border border-line bg-surface shadow-pop"
          style={{ top: pos?.top, left: pos?.left, width: pos?.width, maxHeight: 'min(60dvh, 20rem)' }}
        >
          <ul className="max-h-[min(60dvh,20rem)] overflow-y-auto py-1">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-muted ${o.value === value ? 'font-medium text-trailblaze' : 'text-ink'}`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

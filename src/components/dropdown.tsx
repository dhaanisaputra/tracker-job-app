'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/components/language-provider'

export function Dropdown({ value, options, onChange, placeholder, panelWidth }: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  placeholder?: string
  panelWidth?: number
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const { t } = useLang()
  const ph = placeholder ?? t('common.select')

  useEffect(() => {
    const place = () => {
      if (open && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect()
        // panel width (optionally wider than the trigger); keep on-screen
        const width = Math.min(panelWidth ?? r.width, window.innerWidth - 16)
        const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8))
        setPos({ top: r.bottom + 4, left, width })
      }
      if (!open) setPos(null)
    }
    place()
    // close when tapping outside the dropdown (button or panel)
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    // keep the fixed-positioned panel anchored to the trigger while scrolling
    // (re-position instead of closing, so the list doesn't vanish on scroll)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    document.addEventListener('click', onDocClick)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
      document.removeEventListener('click', onDocClick)
    }
  }, [open, panelWidth])

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
        <span className="truncate">{current ?? ph}</span>
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

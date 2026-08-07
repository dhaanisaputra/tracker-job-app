'use client'

import { useEffect, useRef, useState } from 'react'

export function Dropdown({ value, options, onChange, placeholder = 'Pilih' }: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      // keep panel on-screen horizontally and compact on mobile
      const width = Math.min(160, r.width)
      const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8))
      setPos({ top: r.bottom + 4, left, width })
    }
    if (!open) setPos(null)
  }, [open])

  const current = options.find((o) => o.value === value)?.label

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full truncate rounded-md border border-line bg-surface px-2.5 py-2 text-left text-sm ${value ? 'text-ink' : 'text-stone'}`}
      >
        {current ?? placeholder}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="fixed z-20 overflow-hidden rounded-md border border-line bg-surface shadow-pop"
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
        </>
      )}
    </>
  )
}

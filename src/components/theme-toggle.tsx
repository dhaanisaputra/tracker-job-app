'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useLang } from '@/components/language-provider'

export function ThemeToggle({ dark = false }: { dark?: boolean }) {
  const { t } = useLang()
  const [isDark, setDark] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, sync icon with FOUC pre-hydration class
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
      className={`rounded-md p-2 transition ${dark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-stone hover:bg-stone/10'}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

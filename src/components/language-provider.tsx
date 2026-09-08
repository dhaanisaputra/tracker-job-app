'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDict, parseLang, type Key, type Lang } from '@/lib/i18n'

type Ctx = { lang: Lang; t: (k: Key) => string; setLang: (l: Lang) => void }

const LanguageContext = createContext<Ctx>({ lang: 'id', t: (k) => k, setLang: () => {} })

function readInitial(): Lang {
  if (typeof document === 'undefined') return 'id'
  return parseLang(document.documentElement.dataset.lang)
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>(readInitial)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, sync from server-rendered attr
    setLangState(readInitial())
  }, [])

  const setLang = useCallback((l: Lang) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000`
    try { localStorage.setItem('lang', l) } catch { /* ignore */ }
    document.documentElement.lang = l
    document.documentElement.dataset.lang = l
    setLangState(l)
    router.refresh()
  }, [router])

  const t = useCallback((k: Key) => getDict(lang)[k] ?? k, [lang])

  return <LanguageContext.Provider value={{ lang, t, setLang }}>{children}</LanguageContext.Provider>
}

export function useLang(): Ctx {
  return useContext(LanguageContext)
}

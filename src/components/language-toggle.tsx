'use client'

import { useLang } from './language-provider'
import type { Lang } from '@/lib/i18n'

export function LanguageToggle({ dark = false }: { dark?: boolean }) {
  const { lang, setLang, t } = useLang()
  return (
    <div
      role="group"
      aria-label={t('lang.switch')}
      className={`flex overflow-hidden rounded-md border border-line text-xs font-semibold ${dark ? '' : ''}`}
    >
      {(['id', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2 py-2 uppercase transition ${lang === l ? 'bg-trailblaze text-white' : 'text-stone hover:bg-stone/10'}`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

import { cookies } from 'next/headers'
import { parseLang, type Lang } from './i18n'

export async function getServerLang(): Promise<Lang> {
  const c = await cookies()
  return parseLang(c.get('lang')?.value)
}

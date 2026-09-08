'use server'

import { revalidatePath } from 'next/cache'
import { serverDb } from '@/lib/server-db'
import { getCurrentUser } from '@/lib/server-user'
import { getServerLang } from '@/lib/server-lang'
import { getDict } from '@/lib/i18n'

export type UpdateProfileResult = { error: string | null }

export async function updateProfile(_prev: UpdateProfileResult | undefined, formData: FormData): Promise<UpdateProfileResult> {
  const t = getDict(await getServerLang())
  const user = await getCurrentUser()
  if (!user) return { error: t['akun.sessionErr'] }

  const payload = {
    full_name: (formData.get('full_name') as string | null) || null,
    target_role: (formData.get('target_role') as string | null) || null,
    linkedin_url: (formData.get('linkedin_url') as string | null) || null,
    portfolio_url: (formData.get('portfolio_url') as string | null) || null,
    salary_expectation: formData.get('salary_expectation') ? Number(formData.get('salary_expectation')) : null,
  }

  const { error } = await (await serverDb()).from('profiles').upsert({ id: user.id, ...payload }, { onConflict: 'id' })
  revalidatePath('/akun')
  return { error: error ? t['akun.saveFail'] : null }
}

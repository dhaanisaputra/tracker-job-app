'use server'

import { revalidatePath } from 'next/cache'
import { serverDb } from '@/lib/server-db'
import { getCurrentUser } from '@/lib/server-user'

export type UpdateProfileResult = { error: string | null }

export async function updateProfile(_prev: UpdateProfileResult | undefined, formData: FormData): Promise<UpdateProfileResult> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Tidak dapat menyimpan profil: sesi berakhir.' }

  const payload = {
    full_name: (formData.get('full_name') as string | null) || null,
    target_role: (formData.get('target_role') as string | null) || null,
    linkedin_url: (formData.get('linkedin_url') as string | null) || null,
    portfolio_url: (formData.get('portfolio_url') as string | null) || null,
    salary_expectation: formData.get('salary_expectation') ? Number(formData.get('salary_expectation')) : null,
  }

  const { error } = await (await serverDb()).from('profiles').upsert({ id: user.id, ...payload }, { onConflict: 'id' })
  revalidatePath('/akun')
  return { error: error ? 'Gagal menyimpan profil.' : null }
}

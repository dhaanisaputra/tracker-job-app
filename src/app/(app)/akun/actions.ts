'use server'

import { revalidatePath } from 'next/cache'
import { serverDb } from '@/lib/server-db'
import { getCurrentUser } from '@/lib/server-user'

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) return

  const payload = {
    full_name: (formData.get('full_name') as string | null) || null,
    target_role: (formData.get('target_role') as string | null) || null,
    linkedin_url: (formData.get('linkedin_url') as string | null) || null,
    portfolio_url: (formData.get('portfolio_url') as string | null) || null,
    salary_expectation: formData.get('salary_expectation') ? Number(formData.get('salary_expectation')) : null,
  }

  await (await serverDb()).from('profiles').upsert({ id: user.id, ...payload }, { onConflict: 'id' })
  revalidatePath('/akun')
}

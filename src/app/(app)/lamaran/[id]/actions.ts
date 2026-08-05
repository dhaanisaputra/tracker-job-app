'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { serverDb } from '@/lib/server-db'

export async function deleteApplication(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await (await serverDb())
    .from('job_applications')
    .delete()
    .eq('id', id)
  revalidatePath('/dashboard')
  redirect('/dashboard')
}
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { serverDb } from '@/lib/server-db'
import { getCurrentUser } from '@/lib/server-user'

function db() {
  return serverDb()
}

export async function createSource(formData: FormData) {
  const user = await getCurrentUser()
  const name = String(formData.get('name') ?? '').trim()
  if (!user || !name) return

  await (await db()).from('sources').insert({ user_id: user.id, name })
  revalidatePath('/sumber')
}

export async function updateSource(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  if (!id || !name) return

  const { error } = await (await db()).from('sources').update({ name }).eq('id', id)
  if (error) {
    redirect(`/sumber?err=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/sumber')
}

export async function deleteSource(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { error } = await (await db()).from('sources').delete().eq('id', id)
  if (error) {
    redirect(`/sumber?err=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/sumber')
}
import { serverClient } from '@/lib/server-db'

export async function getCurrentUser() {
  const insforge = await serverClient()
  const { data } = await insforge.auth.getCurrentUser()
  return data?.user ?? null
}
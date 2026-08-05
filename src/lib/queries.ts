import { serverDb } from '@/lib/server-db'
import type { Source } from '@/lib/types'

export async function getSources(): Promise<Source[]> {
  const { data, error } = await (await serverDb()).from('sources').select('id, name').order('name')
  return error ? [] : (data as Source[])
}
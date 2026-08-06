import { serverDb } from '@/lib/server-db'
import { SourcesClient } from './sources-client'
import type { Source } from '@/lib/types'

export default async function SourcesPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { data } = await (await serverDb()).from('sources').select('id, name').order('name')
  const { err } = await searchParams
  return <SourcesClient sources={(data ?? []) as Source[]} err={err} />
}

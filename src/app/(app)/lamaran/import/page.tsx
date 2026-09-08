import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BulkImport } from '@/components/bulk-import'
import { PageHeader } from '@/components/page-header'
import { getSources } from '@/lib/queries'
import { getServerLang } from '@/lib/server-lang'
import { getDict } from '@/lib/i18n'

export default async function ImportPage() {
  const sources = await getSources()
  const t = getDict(await getServerLang())

  return (
    <main className="p-4">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ArrowLeft size={16} /> {t['import.back']}
      </Link>
      <PageHeader title={t['import.title']} description={t['import.desc']} />
      <BulkImport sources={sources} />
    </main>
  )
}

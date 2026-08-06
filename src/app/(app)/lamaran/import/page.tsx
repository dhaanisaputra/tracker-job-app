import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BulkImport } from '@/components/bulk-import'
import { PageHeader } from '@/components/page-header'
import { getSources } from '@/lib/queries'

export default async function ImportPage() {
  const sources = await getSources()

  return (
    <main className="p-4">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ArrowLeft size={16} /> Kembali
      </Link>
      <PageHeader title="Import Lamaran" description="Upload .xlsx atau .csv, baris duplikat akan ditandai sebelum diimport." />
      <BulkImport sources={sources} />
    </main>
  )
}
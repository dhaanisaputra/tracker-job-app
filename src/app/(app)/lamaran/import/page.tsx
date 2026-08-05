import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BulkImport } from '@/components/bulk-import'
import { getSources } from '@/lib/queries'

export default async function ImportPage() {
  const sources = await getSources()

  return (
    <main className="p-4">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ArrowLeft size={16} /> Kembali
      </Link>
      <h1 className="mb-1 font-display text-2xl font-bold">Import Lamaran</h1>
      <p className="mb-6 text-sm text-stone">Upload .xlsx atau .csv — baris duplikat akan ditandai sebelum diimport.</p>
      <BulkImport sources={sources} />
    </main>
  )
}
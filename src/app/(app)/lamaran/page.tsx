import Link from 'next/link'
import { Plus, FileUp } from 'lucide-react'
import { LamaranList } from '@/components/lamaran-list'
import { getSources } from '@/lib/queries'
import { PageHeader } from '@/components/page-header'

export default async function LamaranPage() {
  const sources = await getSources()

  return (
    <main className="p-4">
      <PageHeader title="Lamaran" description="Semua lamaran yang kamu kirim.">
        <Link href="/lamaran/import" className="btn-secondary">
          <FileUp size={16} /> Impor
        </Link>
        <Link href="/lamaran/baru" className="btn-primary">
          <Plus size={16} /> Tambah
        </Link>
      </PageHeader>
      <LamaranList variant="full" sources={sources} />
    </main>
  )
}

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ApplicationForm } from '@/components/application-form'
import { PageHeader } from '@/components/page-header'
import { getSources } from '@/lib/queries'

export default async function NewApplicationPage() {
  const sources = await getSources()

  return (
    <main className="p-4">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ArrowLeft size={16} /> Kembali
      </Link>
      <PageHeader title="Tambah Lamaran" description="Catat lamaran baru yang kamu kirim." />
      <ApplicationForm sources={sources} />
    </main>
  )
}
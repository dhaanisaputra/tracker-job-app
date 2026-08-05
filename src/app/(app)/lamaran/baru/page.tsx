import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ApplicationForm } from '@/components/application-form'
import { getSources } from '@/lib/queries'

export default async function NewApplicationPage() {
  const sources = await getSources()

  return (
    <main className="p-4">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ArrowLeft size={16} /> Kembali
      </Link>
      <h1 className="mb-6 font-display text-2xl font-bold">Tambah Lamaran</h1>
      <ApplicationForm sources={sources} />
    </main>
  )
}
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ApplicationForm } from '@/components/application-form'
import { PageHeader } from '@/components/page-header'
import { getSources } from '@/lib/queries'
import { serverDb } from '@/lib/server-db'
import type { JobApplication } from '@/lib/types'

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sources = await getSources()
  const insforge = await serverDb()
  const { data } = await insforge.from('job_applications').select('*').eq('id', id).single()
  const application = data as JobApplication | null

  if (!application) return <p className="p-4 text-sm text-stone">Lamaran tidak ditemukan.</p>

  return (
    <main className="p-4">
      <Link href={`/lamaran/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ArrowLeft size={16} /> Kembali
      </Link>
      <PageHeader title="Edit Lamaran" description="Perbarui detail lamaran kamu." />
      <ApplicationForm sources={sources} initial={application} />
    </main>
  )
}
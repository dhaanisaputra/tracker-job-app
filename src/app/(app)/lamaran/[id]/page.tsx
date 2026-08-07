import Link from 'next/link'
import { serverDb } from '@/lib/server-db'
import { ArrowLeft, ExternalLink, Pencil, MapPin, Calendar, User } from 'lucide-react'
import { deleteApplication } from './actions'
import { ConfirmDelete } from '@/components/confirm-delete'
import { StatusBadge } from '@/components/lamaran-list'
import { TaskBadge } from '@/components/task-badge'

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 text-sm">
      <span className="text-stone">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  )
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const insforge = await serverDb()

  const { data: app } = await insforge
    .from('job_applications')
    .select('*, sources(name)')
    .eq('id', id)
    .single()

  const { data: history } = await insforge
    .from('application_status_history')
    .select('status, changed_at')
    .eq('application_id', id)
    .order('changed_at', { ascending: false })

  if (!app) return <p className="p-4 text-sm text-stone">Lamaran tidak ditemukan.</p>

  const fmt = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/lamaran" className="inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/lamaran/${id}/edit`}
            className="btn-secondary"
          >
            <Pencil size={14} /> Edit
          </Link>
          <ConfirmDelete action={deleteApplication} id={id} />
        </div>
      </div>

      <header className="mb-6">
        <h1 className="font-display text-display-lg leading-tight text-ink">{app.company_name}</h1>
        <p className="mt-1 text-base text-stone">{app.role_title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={app.current_status} />
          <TaskBadge currentStatus={app.current_status} deadline={app.task_deadline} />
          <span className="text-xs text-stone">
            {app.sources?.name} · <Calendar size={12} className="inline" /> {fmt(app.applied_date)}
          </span>
          {app.job_url && (
            <a
              href={app.job_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-denim hover:underline"
            >
              Link lowongan <ExternalLink size={12} />
            </a>
          )}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 font-display text-headline-sm text-ink">Detail</h2>
          <Row label="Lokasi" value={app.location && <span className="flex items-center justify-end gap-1"><MapPin size={14} /> {app.location}</span>} />
          <Row label="Tipe" value={app.employment_type} />
          <Row label="Cara Kerja" value={app.work_arrangement} />
          <Row
            label="Gaji"
            value={
              app.salary_min != null || app.salary_max != null
                ? `${app.salary_min != null ? app.salary_min : '?'} - ${app.salary_max != null ? app.salary_max : '?'}`
                : undefined
            }
          />
          <Row label="Kontak" value={app.contact_person && <span className="flex items-center justify-end gap-1"><User size={14} /> {app.contact_person}</span>} />
          <Row label="Interview dijadwalkan" value={app.interview_scheduled_at && new Date(app.interview_scheduled_at).toLocaleString('id-ID')} />
          <Row label="Follow-up berikutnya" value={fmt(app.next_follow_up_date)} />
          {app.offer_salary != null && <Row label="Nominal offer" value={app.offer_salary} />}
          {app.offer_deadline && <Row label="Deadline offer" value={fmt(app.offer_deadline)} />}
        </section>

        <section className="space-y-6">
          {app.job_description && (
            <div className="card p-4">
              <h2 className="mb-2 font-display text-headline-sm text-ink">Deskripsi Pekerjaan</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{app.job_description}</p>
            </div>
          )}
          {app.notes && (
            <div className="card p-4">
              <h2 className="mb-2 font-display text-headline-sm text-ink">Catatan</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{app.notes}</p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 card p-4">
        <h2 className="mb-4 font-display text-headline-sm text-ink">Riwayat Status</h2>
        {history && history.length > 0 ? (
          <ol className="relative border-l border-line pl-4">
            {history.map((h) => (
              <li key={`${h.status}-${h.changed_at}`} className="mb-4 last:mb-0">
                <span className="absolute -left-1.5 mt-1.5 h-2 w-2 rounded-full bg-trailblaze" />
                <StatusBadge status={h.status} />
                <span className="ml-2 text-xs text-stone">
                  {new Date(h.changed_at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-stone">Belum ada riwayat status.</p>
        )}
      </section>
    </main>
  )
}
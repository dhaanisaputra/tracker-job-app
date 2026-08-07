'use client'

import { useEffect, useRef, useState } from 'react'
import { startTransition } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, CheckSquare, Square, Trash2, MoreHorizontal, Pencil, Eye } from 'lucide-react'
import { insforge } from '@/lib/browser-client'
import { STATUSES, STATUS_COLORS } from '@/lib/types'
import type { ApplicationWithSource, Source } from '@/lib/types'
import { deleteApplication } from '@/app/(app)/lamaran/[id]/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from '@/components/toast'
import { TaskBadge } from '@/components/task-badge'
import { Dropdown } from '@/components/dropdown'

const PAGE_SIZE = 15

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-label-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-stone/15 text-stone'} ${className ?? ''}`}>
      {status}
    </span>
  )
}

type Props =
  | { variant: 'full'; sources: Source[] }
  | { variant: 'compact'; sources: Source[]; initialItems: ApplicationWithSource[] }

export function LamaranList(props: Props) {
  if (props.variant === 'compact') {
    const { initialItems } = props
    return (
      <div className="card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone">Aktivitas Terbaru</h2>
          <Link href="/lamaran" className="text-sm font-medium text-trailblaze hover:underline">
            Lihat semua
          </Link>
        </div>
        {initialItems.length === 0 ? (
          <p className="p-6 text-center text-sm text-stone">Belum ada lamaran.</p>
        ) : (
          <ul className="divide-y divide-line">
            {initialItems.map((app) => (
              <li key={app.id}>
                <Link href={`/lamaran/${app.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{app.company_name}</p>
                    <p className="truncate text-xs text-stone">{app.role_title}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={app.current_status} />
                    <TaskBadge currentStatus={app.current_status} deadline={app.task_deadline} />
                    <span className="text-label-xs text-stone">
                      {new Date(app.applied_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const { sources } = props
  return <FullList sources={sources} />
}

function FullList({ sources }: { sources: Source[] }) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [confirmBulk, setConfirmBulk] = useState(false)

  // ponytail: simple debounce via timeout
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | undefined>()
  useEffect(() => () => clearTimeout(timer), [timer])
  function onSearch(v: string) {
    setSearch(v)
    clearTimeout(timer)
    setTimer(setTimeout(() => { setDebounced(v); setPage(0) }, 350))
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['applications', debounced, status, source, page],
    queryFn: async () => {
      let q = insforge.database.from('job_applications').select('id, company_name, role_title, current_status, task_deadline, applied_date, source_id, sources(name)', { count: 'exact' }).order('applied_date', { ascending: false })
      if (debounced) {
        q = q.or(`company_name.ilike.%${debounced}%,role_title.ilike.%${debounced}%`)
      }
      if (status) q = q.eq('current_status', status)
      if (source) q = q.eq('source_id', source)
      q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      const res = await q
      return { items: (res.data ?? []) as unknown as ApplicationWithSource[], count: res.count ?? 0 }
    },
  })

  const items = data?.items ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runBulkDelete() {
    if (selected.size === 0) return
    await insforge.database.from('job_applications').delete().in('id', [...selected])
    const n = selected.size
    setSelected(new Set())
    setPage(0)
    toast(`${n} lamaran dihapus`)
    refetch()
  }

  // ponytail: single shared status-update menu for bulk rows
  async function bulkStatus(s: string) {
    if (selected.size === 0) return
    await insforge.database.from('job_applications').update({ current_status: s }).in('id', [...selected])
    setSelected(new Set())
    toast('Status diperbarui')
    refetch()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-auto sm:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari perusahaan / role..."
            className="field py-2 pl-9 pr-3"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <Dropdown
            value={status}
            options={[{ value: '', label: 'Status' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
            onChange={(v) => { setStatus(v); setPage(0) }}
            placeholder="Status"
          />
          <Dropdown
            value={source}
            options={[{ value: '', label: 'Sumber' }, ...sources.map((s) => ({ value: s.id, label: s.name }))]}
            onChange={(v) => { setSource(v); setPage(0) }}
            placeholder="Sumber"
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-denim/10 p-2 text-sm">
          <span className="px-1 text-sm font-medium text-denim">{selected.size} dipilih</span>
          <button onClick={() => setConfirmBulk(true)} className="inline-flex items-center gap-1 rounded-md bg-ember px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"><Trash2 size={14} /> Hapus</button>
          <div className="w-full sm:w-auto">
            <Dropdown
              value=""
              options={[{ value: '', label: 'Ubah status...' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
              onChange={(v) => v && bulkStatus(v)}
              placeholder="Ubah status..."
              panelWidth={240}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10 text-stone"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-base font-semibold text-ink">Belum ada lamaran</p>
          <p className="mt-1 text-sm text-stone">Mulai catat lamaran pertamamu, atau ubah pencarian.</p>
          <Link href="/lamaran/baru" className="btn-primary mt-4 inline-flex">
            Tambah lamaran
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="space-y-2 md:hidden">
            {items.map((app) => (
              <li key={app.id} className="card flex items-center gap-3 p-3">
                <button onClick={() => toggleSelect(app.id)} className="text-stone">
                  {selected.has(app.id) ? <CheckSquare size={18} className="text-trailblaze" /> : <Square size={18} />}
                </button>
                <Link href={`/lamaran/${app.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{app.company_name}</p>
                  <p className="truncate text-xs text-stone">{app.role_title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-label-xs text-stone">
                    <StatusBadge status={app.current_status} />
                    <TaskBadge currentStatus={app.current_status} deadline={app.task_deadline} />
                    <span>{app.sources?.name}</span>
                    <span>{new Date(app.applied_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </Link>
                <RowActions appId={app.id} open={openMenu === app.id} onToggle={() => setOpenMenu(openMenu === app.id ? null : app.id)} />
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-left text-label-xs uppercase tracking-wider text-stone">
                  <th className="p-3 font-semibold" />
                  <th className="p-3 font-semibold">Perusahaan</th>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">Sumber</th>
                  <th className="p-3 font-semibold">Tanggal</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((app) => (
                  <tr key={app.id} className="border-b border-line last:border-0 hover:bg-surface-muted">
                    <td className="p-3">
                      <button onClick={() => toggleSelect(app.id)} className="text-stone">
                        {selected.has(app.id) ? <CheckSquare size={16} className="text-trailblaze" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-ink">
                      <Link href={`/lamaran/${app.id}`} className="hover:text-trailblaze hover:underline">{app.company_name}</Link>
                    </td>
                    <td className="p-3 text-stone">{app.role_title}</td>
                    <td className="p-3 text-stone">{app.sources?.name}</td>
                    <td className="p-3 font-mono text-stone">{app.applied_date}</td>
                    <td className="p-3">
                      <StatusBadge status={app.current_status} />
                      <div className="mt-1"><TaskBadge currentStatus={app.current_status} deadline={app.task_deadline} /></div>
                    </td>
                    <td className="p-3">
                      <RowActions appId={app.id} open={openMenu === app.id} onToggle={() => setOpenMenu(openMenu === app.id ? null : app.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-secondary px-3 py-1.5"
              >
                Sebelumnya
              </button>
              <span className="text-stone">Hal {page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-secondary px-3 py-1.5"
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirmBulk}
        title="Hapus lamaran?"
        message={`Hapus ${selected.size} lamaran terpilih? Tindakan tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        onCancel={() => setConfirmBulk(false)}
        onConfirm={() => {
          setConfirmBulk(false)
          runBulkDelete()
        }}
      />
    </div>
  )
}

function RowActions({ appId, open, onToggle }: { appId: string; open: boolean; onToggle: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.right - 160 })
    }
    if (!open) setPos(null)
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={onToggle} aria-label="Tindakan" className="btn-ghost p-2">
        <MoreHorizontal size={18} />
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div
            className="fixed z-20 w-40 rounded-md border border-line bg-surface p-1 shadow-pop"
            style={{ top: pos.top, left: pos.left }}
          >
            <Link href={`/lamaran/${appId}`} onClick={onToggle} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-muted">
              <Eye size={14} /> Lihat
            </Link>
            <Link href={`/lamaran/${appId}/edit`} onClick={onToggle} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-muted">
              <Pencil size={14} /> Edit
            </Link>
            <button
              onClick={() => {
                onToggle()
                setConfirmOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-ember hover:bg-ember/10"
            >
              <Trash2 size={14} /> Hapus
            </button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus lamaran?"
        message="Lamaran ini akan dihapus permanen. Tindakan tidak bisa dibatalkan."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          const fd = new FormData()
          fd.append('id', appId)
          startTransition(() => deleteApplication(fd))
        }}
      />
    </>
  )
}

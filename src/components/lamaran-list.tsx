'use client'

import { useEffect, useRef, useState } from 'react'
import { startTransition } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, CheckSquare, Square, Trash2, MoreHorizontal, Pencil, Eye, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { insforge } from '@/lib/browser-client'
import { STATUSES, STATUS_COLORS } from '@/lib/types'
import type { ApplicationWithSource, Source } from '@/lib/types'
import { deleteApplication } from '@/app/(app)/lamaran/[id]/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from '@/components/toast'
import { TaskBadge } from '@/components/task-badge'
import { Dropdown } from '@/components/dropdown'
import { useLang } from '@/components/language-provider'
import { dateLocale, type Key, type Lang } from '@/lib/i18n'

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
  const { t, lang } = useLang()
  if (props.variant === 'compact') {
    const { initialItems } = props
    return (
      <div className="card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone">{t('dashboard.recent')}</h2>
          <Link href="/lamaran" className="text-sm font-medium text-trailblaze hover:underline">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {initialItems.length === 0 ? (
          <p className="p-6 text-center text-sm text-stone">{t('dashboard.emptyRecent')}</p>
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
                      {new Date(app.applied_date).toLocaleDateString(dateLocale(lang), { day: '2-digit', month: 'short' })}
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
  return <FullList sources={sources} t={t} lang={lang} />
}

function FullList({ sources, t, lang }: { sources: Source[]; t: (k: Key) => string; lang: Lang }) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'applied_date', dir: 'desc' })
  const DEFAULT_SORT = { key: 'applied_date', dir: 'desc' as const }
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
    queryKey: ['applications', debounced, status, source, sort.key, sort.dir, page],
    queryFn: async () => {
      let q = insforge.database.from('job_applications').select('id, company_name, role_title, current_status, task_deadline, applied_date, source_id, sources(name)', { count: 'exact' })
      if (debounced) {
        q = q.or(`company_name.ilike.%${debounced}%,role_title.ilike.%${debounced}%`)
      }
      if (status) q = q.eq('current_status', status)
      if (source) q = q.eq('source_id', source)
      q = q.order(sort.key, { ascending: sort.dir === 'asc' })
      q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      const res = await q
      return { items: (res.data ?? []) as unknown as ApplicationWithSource[], count: res.count ?? 0 }
    },
  })

  const hasFilter = debounced !== '' || status !== '' || source !== ''
  const resetFilters = () => {
    setSearch('')
    setDebounced('')
    setStatus('')
    setSource('')
    setPage(0)
  }

  const items = data?.items ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  function toggleSort(key: string) {
    setPage(0)
    setSort((prev) => {
      // third click on the same column returns to the default sort
      if (prev.key === key) {
        if (prev.dir === 'asc') return { key, dir: 'desc' }
        return DEFAULT_SORT
      }
      return { key, dir: 'asc' }
    })
  }

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
    toast(t('lamaran.toastDeleted').replace('{n}', String(n)))
    refetch()
  }

  // ponytail: single shared status-update menu for bulk rows
  async function bulkStatus(s: string) {
    if (selected.size === 0) return
    await insforge.database.from('job_applications').update({ current_status: s }).in('id', [...selected])
    setSelected(new Set())
    toast(t('lamaran.toastStatus'))
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
            placeholder={t('lamaran.searchPh')}
            className="field py-2 pl-9 pr-3"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <div className="sm:w-56">
            <Dropdown
              value={status}
              options={[{ value: '', label: t('lamaran.statusAll') }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
              onChange={(v) => { setStatus(v); setPage(0) }}
              placeholder={t('lamaran.statusAll')}
            />
          </div>
          <div className="sm:w-56">
            <Dropdown
              value={source}
              options={[{ value: '', label: t('lamaran.sourceAll') }, ...sources.map((s) => ({ value: s.id, label: s.name }))]}
              onChange={(v) => { setSource(v); setPage(0) }}
              placeholder={t('lamaran.sourceAll')}
            />
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilter}
            className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-stone transition-colors hover:border-ember/40 hover:text-ember disabled:cursor-not-allowed disabled:opacity-40 sm:mt-0"
          >
            <RotateCcw size={14} />
            {t('common.reset')}
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-denim/10 p-2 text-sm">
          <span className="px-1 text-sm font-medium text-denim">{t('lamaran.selected').replace('{n}', String(selected.size))}</span>
          <button onClick={() => setConfirmBulk(true)} className="inline-flex items-center gap-1 rounded-md bg-ember px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"><Trash2 size={14} /> {t('lamaran.bulkDelete')}</button>
          <div className="w-full sm:w-auto">
            <Dropdown
              value=""
              options={[{ value: '', label: t('lamaran.changeStatus') }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
              onChange={(v) => v && bulkStatus(v)}
              placeholder={t('lamaran.changeStatus')}
              panelWidth={240}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10 text-stone"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-base font-semibold text-ink">{t('lamaran.empty')}</p>
          <p className="mt-1 text-sm text-stone">{t('lamaran.emptyHint')}</p>
          <Link href="/lamaran/baru" className="btn-primary mt-4 inline-flex">
            {t('lamaran.addFirst')}
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
                    <span>{new Date(app.applied_date).toLocaleDateString(dateLocale(lang), { day: '2-digit', month: 'short' })}</span>
                  </div>
                </Link>
                      <RowActions appId={app.id} open={openMenu === app.id} onToggle={() => setOpenMenu(openMenu === app.id ? null : app.id)} t={t} lang={lang} />
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-left text-label-xs uppercase tracking-wider text-stone">
                  <th className="p-3 font-semibold" />
                  <SortHeader label={t('lamaran.colCompany')} sortKey="company_name" sort={sort} onSort={toggleSort} />
                  <SortHeader label={t('lamaran.colRole')} sortKey="role_title" sort={sort} onSort={toggleSort} />
                  <SortHeader label={t('lamaran.colSource')} sortKey="sources(name)" sort={sort} onSort={toggleSort} />
                  <SortHeader label={t('lamaran.colDate')} sortKey="applied_date" sort={sort} onSort={toggleSort} />
                  <SortHeader label={t('lamaran.colStatus')} sortKey="current_status" sort={sort} onSort={toggleSort} />
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
                <RowActions appId={app.id} open={openMenu === app.id} onToggle={() => setOpenMenu(openMenu === app.id ? null : app.id)} t={t} lang={lang} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={data?.count ?? 0}
            pageSize={PAGE_SIZE}
            onPage={setPage}
            t={t}
            lang={lang}
          />
        </>
      )}
      <ConfirmDialog
        open={confirmBulk}
        title={t('lamaran.delTitle')}
        message={t('lamaran.bulkDelMsg').replace('{n}', String(selected.size))}
        confirmLabel={t('common.delete')}
        onCancel={() => setConfirmBulk(false)}
        onConfirm={() => {
          setConfirmBulk(false)
          runBulkDelete()
        }}
      />
    </div>
  )
}

function SortHeader({ label, sortKey, sort, onSort }: {
  label: string
  sortKey: string
  sort: { key: string; dir: 'asc' | 'desc' }
  onSort: (key: string) => void
}) {
  const active = sort.key === sortKey
  return (
    <th className="p-3">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider transition hover:text-ink ${active ? 'text-trailblaze' : 'text-stone'}`}
      >
        {label}
        <span className="flex flex-col leading-none">
          <ChevronUp size={10} className={`-mb-0.5 ${active && sort.dir === 'asc' ? 'text-trailblaze' : 'text-stone/40'}`} />
          <ChevronDown size={10} className={`${active && sort.dir === 'desc' ? 'text-trailblaze' : 'text-stone/40'}`} />
        </span>
      </button>
    </th>
  )
}

function Pagination({ page, totalPages, total, pageSize, onPage, t }: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPage: (p: number) => void
  t: (k: Key) => string
  lang: Lang
}) {
  if (total === 0) return null
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)

  // window of page numbers: first, last, neighbors of current
  const pages = new Set<number>([0, totalPages - 1, page - 1, page, page + 1])
  const list = [...pages].filter((p) => p >= 0 && p < totalPages).sort((a, b) => a - b)
  const items: (number | '...')[] = []
  let prev = -2
  for (const p of list) {
    if (p - prev > 1) items.push('...')
    items.push(p)
    prev = p
  }

  const cls = (disabled: boolean) =>
    `inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition disabled:opacity-40 disabled:pointer-events-none ${
      disabled ? 'text-stone' : 'text-ink hover:bg-surface-muted'
    }`

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-stone">
        {t('lamaran.showing')} <span className="font-semibold text-ink">{from}-{to}</span> {t('lamaran.ofWord')}{' '}
        <span className="font-semibold text-ink">{total}</span> {t('lamaran.appsWord')}
      </p>
      <nav className="flex items-center gap-1" aria-label={t('lamaran.pagination')}>
        <button type="button" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0} className={cls(page === 0)} aria-label={t('lamaran.prevPage')}>
          <ChevronLeft size={16} />
        </button>
        {items.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1 text-sm text-stone">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold transition ${
                p === page ? 'bg-trailblaze text-white shadow-sm' : 'text-ink hover:bg-surface-muted'
              }`}
            >
              {p + 1}
            </button>
          ),
        )}
        <button type="button" onClick={() => onPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className={cls(page >= totalPages - 1)} aria-label={t('lamaran.nextPage')}>
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  )
}

function RowActions({ appId, open, onToggle, t }: { appId: string; open: boolean; onToggle: () => void; t: (k: Key) => string; lang: Lang }) {
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
      <button ref={btnRef} onClick={onToggle} aria-label={t('lamaran.rowActions')} className="btn-ghost p-2">
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
              <Eye size={14} /> {t('common.view')}
            </Link>
            <Link href={`/lamaran/${appId}/edit`} onClick={onToggle} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-muted">
              <Pencil size={14} /> {t('common.edit')}
            </Link>
            <button
              onClick={() => {
                onToggle()
                setConfirmOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-ember hover:bg-ember/10"
            >
              <Trash2 size={14} /> {t('common.delete')}
            </button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={t('lamaran.delTitle')}
        message={t('lamaran.delMsg')}
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

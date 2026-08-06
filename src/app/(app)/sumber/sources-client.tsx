'use client'

import { startTransition, useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { Source } from '@/lib/types'
import { createSource, deleteSource } from './actions'
import { EditSourceDialog } from './edit-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { toast } from '@/components/toast'

const inputCls = 'field'

export function SourcesClient({ sources, err }: { sources: Source[]; err?: string }) {
  const [editing, setEditing] = useState<Source | null>(null)
  const [deleting, setDeleting] = useState<Source | null>(null)

  return (
    <main className="p-4">
      <PageHeader title="Sumber Lamaran" description="Sumber tempat kamu menemukan lowongan." />

      {err && <p className="mb-4 rounded-lg bg-ember/10 px-3 py-2 text-sm text-ember">{err}</p>}

      <div className="mb-6 rounded-xl border border-line bg-surface p-4 shadow-card">
        <p className="mb-2 text-sm font-semibold text-ink">Tambah sumber baru</p>
        <form action={createSource} className="flex items-center gap-2">
          <input name="name" required placeholder="Nama sumber" className={inputCls} />
          <button type="submit" className="btn-primary">
            <Plus size={16} /> Tambah
          </button>
        </form>
      </div>

      {sources.length === 0 ? (
        <p className="text-sm text-stone">Belum ada sumber. Tambahkan yang pertama.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface shadow-card">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-medium text-ink">{s.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing(s)} className="rounded-lg p-2 text-stone hover:bg-stone/10" aria-label="Edit">
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleting(s)}
                  className="rounded-lg p-2 text-ember hover:bg-ember/10"
                  title="Hapus (tidak bisa hapus sumber yang masih dipakai)"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Hapus sumber?"
        message={deleting ? `Sumber "${deleting.name}" akan dihapus.` : ''}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const s = deleting
          setDeleting(null)
          if (!s) return
          const fd = new FormData()
          fd.append('id', s.id)
          startTransition(() => deleteSource(fd))
          toast('Sumber dihapus')
        }}
      />
      <EditSourceDialog source={editing} open={editing !== null} onClose={() => setEditing(null)} />
    </main>
  )
}

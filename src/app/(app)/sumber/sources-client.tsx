'use client'

import { startTransition, useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { Source } from '@/lib/types'
import { createSource, deleteSource } from './actions'
import { EditSourceDialog } from './edit-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { toast } from '@/components/toast'
import { useLang } from '@/components/language-provider'

const inputCls = 'field'

export function SourcesClient({ sources, err }: { sources: Source[]; err?: string }) {
  const { t } = useLang()
  const [editing, setEditing] = useState<Source | null>(null)
  const [deleting, setDeleting] = useState<Source | null>(null)

  return (
    <main className="p-4">
      <PageHeader title={t('sumber.title')} description={t('sumber.desc')} />

      {err && <p className="mb-4 rounded-lg bg-ember/10 px-3 py-2 text-sm text-ember">{err}</p>}

      <div className="card mb-6 p-4">
        <p className="mb-2 text-sm font-semibold text-ink">{t('sumber.addNew')}</p>
        <form action={createSource} className="flex items-center gap-2">
          <input name="name" required placeholder={t('sumber.namePh')} className={inputCls} />
          <button type="submit" className="btn-primary">
            <Plus size={16} /> {t('common.add')}
          </button>
        </form>
      </div>

      {sources.length === 0 ? (
        <p className="text-sm text-stone">{t('sumber.empty')}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-medium text-ink">{s.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing(s)} className="rounded-md p-2 text-stone hover:bg-stone/10" aria-label={t('common.edit')}>
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleting(s)}
                  className="rounded-md p-2 text-ember hover:bg-ember/10"
                  title={t('sumber.delHint')}
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
        title={t('sumber.delTitle')}
        message={deleting ? t('sumber.delMsg').replace('{name}', deleting.name) : ''}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const s = deleting
          setDeleting(null)
          if (!s) return
          const fd = new FormData()
          fd.append('id', s.id)
          startTransition(() => deleteSource(fd))
          toast(t('sumber.toastDeleted'))
        }}
      />
      <EditSourceDialog source={editing} open={editing !== null} onClose={() => setEditing(null)} />
    </main>
  )
}

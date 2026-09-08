'use client'

import { startTransition, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLang } from '@/components/language-provider'

export function ConfirmDelete({ action, id }: { action: (fd: FormData) => Promise<void>; id: string }) {
  const [open, setOpen] = useState(false)
  const { t } = useLang()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-danger"
      >
        <Trash2 size={14} /> {t('lamaran.delCta')}
      </button>
      <ConfirmDialog
        open={open}
        title={t('lamaran.delTitle')}
        message={t('lamaran.delMsg')}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false)
          const fd = new FormData()
          fd.append('id', id)
          startTransition(() => action(fd))
        }}
      />
    </>
  )
}
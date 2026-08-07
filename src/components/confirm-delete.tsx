'use client'

import { startTransition, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

export function ConfirmDelete({ action, id }: { action: (fd: FormData) => Promise<void>; id: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-danger"
      >
        <Trash2 size={14} /> Hapus
      </button>
      <ConfirmDialog
        open={open}
        title="Hapus lamaran?"
        message="Lamaran ini akan dihapus permanen. Tindakan tidak bisa dibatalkan."
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
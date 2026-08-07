'use client'

import { Modal } from '@/components/modal'

type Props = {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Hapus', onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-stone">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="btn-danger"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

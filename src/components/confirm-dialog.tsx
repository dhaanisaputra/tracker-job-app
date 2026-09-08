'use client'

import { Modal } from '@/components/modal'
import { useLang } from '@/components/language-provider'

type Props = {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const { t } = useLang()
  const label = confirmLabel ?? t('common.delete')
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-stone">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="btn-danger"
        >
          {label}
        </button>
      </div>
    </Modal>
  )
}

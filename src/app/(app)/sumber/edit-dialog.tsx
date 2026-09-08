'use client'

import { Modal } from '@/components/modal'
import { updateSource } from './actions'
import type { Source } from '@/lib/types'
import { useLang } from '@/components/language-provider'

export function EditSourceDialog({ source, open, onClose }: { source: Source | null; open: boolean; onClose: () => void }) {
  const { t } = useLang()
  return (
    <Modal open={open} onClose={onClose} title={t('sumber.editTitle')}>
      <form
        action={updateSource}
        onSubmit={onClose}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="id" value={source?.id ?? ''} />
        <input
          name="name"
          defaultValue={source?.name}
          required
          placeholder={t('sumber.namePh')}
          className="field flex-1"
        />
        <button type="submit" className="btn-primary">{t('common.save')}</button>
      </form>
    </Modal>
  )
}

'use client'

import { Modal } from '@/components/modal'
import { updateSource } from './actions'
import type { Source } from '@/lib/types'

export function EditSourceDialog({ source, open, onClose }: { source: Source | null; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Edit sumber">
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
          placeholder="Nama sumber"
          className="field flex-1"
        />
        <button type="submit" className="btn-primary">Simpan</button>
      </form>
    </Modal>
  )
}

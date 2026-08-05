'use client'

import { Trash2 } from 'lucide-react'

export function ConfirmDelete({ action, id }: { action: (fd: FormData) => Promise<void>; id: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm('Hapus lamaran ini? Tindakan tidak bisa dibatalkan.')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="flex items-center gap-1 rounded-lg border border-ember/40 px-3 py-1.5 text-sm font-medium text-ember hover:bg-ember/10"
      >
        <Trash2 size={14} /> Hapus
      </button>
    </form>
  )
}
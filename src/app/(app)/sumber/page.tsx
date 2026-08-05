import { Suspense } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { serverDb } from '@/lib/server-db'
import { createSource, updateSource, deleteSource } from './actions'
import type { Source } from '@/lib/types'

async function getSources() {
  const { data, error } = await (await serverDb()).from('sources').select('id, name').order('name')
  return error ? [] : (data as Source[])
}

function SourceForm({ source }: { source?: Source }) {
  return (
    <form action={source ? updateSource : createSource} className="flex items-center gap-2">
      {source && <input type="hidden" name="id" value={source.id} />}
      <input
        name="name"
        defaultValue={source?.name}
        required
        placeholder="Nama sumber"
        className="flex-1 rounded-lg border border-stone/40 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-trailblaze"
      />
      <button
        type="submit"
        className="rounded-lg bg-trailblaze px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Simpan
      </button>
    </form>
  )
}

export default async function SourcesPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sources = await getSources()
  const { err } = await searchParams

  return (
    <main className="p-4">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">Sumber Lamaran</h1>
        <p className="text-sm text-stone">Sumber tempat kamu menemukan lowongan.</p>
      </header>

      {err && <p className="mb-4 rounded-lg bg-ember/10 px-3 py-2 text-sm text-ember">{err}</p>}

      <div className="mb-6 rounded-xl border border-stone/30 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-ink">Tambah sumber baru</p>
        <SourceForm />
      </div>

      <Suspense fallback={<p className="text-sm text-stone">Memuat...</p>}>
        {sources.length === 0 ? (
          <p className="text-sm text-stone">Belum ada sumber. Tambahkan yang pertama.</p>
        ) : (
          <ul className="divide-y divide-stone/20 rounded-xl border border-stone/30 bg-white">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-medium text-ink">{s.name}</span>
                <div className="flex items-center gap-1">
                  <details className="relative">
                    <summary className="cursor-pointer rounded-lg p-2 text-stone hover:bg-stone/10">
                      <Pencil size={16} />
                    </summary>
                    <div className="absolute right-0 top-8 z-10 w-64 rounded-xl border border-stone/30 bg-white p-3 shadow-lg">
                      <SourceForm source={s} />
                    </div>
                  </details>
                  <form action={deleteSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-lg p-2 text-ember hover:bg-ember/10"
                      title="Hapus (kalian tidak bisa menghapus sumber yang masih dipakai)"
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Suspense>
    </main>
  )
}
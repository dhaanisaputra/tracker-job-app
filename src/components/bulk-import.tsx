'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { FileUp, Loader2 } from 'lucide-react'
import { insforge } from '@/lib/browser-client'
import { STATUSES } from '@/lib/types'
import type { Source } from '@/lib/types'
import { Modal } from '@/components/modal'
import { toast } from '@/components/toast'

type Row = {
  company_name: string
  role_title: string
  source_id: string
  applied_date: string
  current_status: string
  job_url?: string | null
  location?: string | null
  notes?: string | null
  checked: boolean
  dup?: boolean
}

export function BulkImport({ sources }: { sources: Source[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  function sourceId(name: string) {
    const hit = sources.find((s) => s.name.toLowerCase() === name.trim().toLowerCase())
    return hit?.id ?? sources[0]?.id ?? ''
  }

  // ponytail: first non-empty string wins, tolerant of header variations
  function pick(r: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
      const v = r[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
    }
    return ''
  }

  async function onFile(file: File) {
    setParsing(true)
    setError('')
    const text = await file.text()
    let parsed: unknown[]
    if (file.name.toLowerCase().endsWith('.csv')) {
      parsed = Papa.parse<Record<string, string>>(text, { header: true }).data
    } else {
      const wb = XLSX.read(text, { type: 'string' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      parsed = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    }

    const today = new Date().toISOString().slice(0, 10)
    const mapped: Row[] = (parsed as Record<string, unknown>[])
      .filter((r) => pick(r, ['company_name', 'company', 'Company']) !== '')
      .map((r) => ({
        company_name: pick(r, ['company_name', 'company', 'Company']),
        role_title: pick(r, ['role_title', 'role', 'Role']) || 'Role',
        source_id: sourceId(pick(r, ['source', 'source_name', 'Source', 'sumber'])) || sources[0]?.id || '',
        applied_date: pick(r, ['applied_date', 'Applied Date', 'tanggal']).slice(0, 10) || today,
        current_status: (STATUSES as readonly string[]).includes(pick(r, ['current_status', 'status'])) ? pick(r, ['current_status', 'status']) : 'Applied',
        job_url: pick(r, ['job_url', 'Job URL']) || null,
        location: pick(r, ['location', 'lokasi']) || null,
        notes: pick(r, ['notes', 'catatan']) || null,
        checked: true,
      }))

    // mark duplicates
    for (let i = 0; i < mapped.length; i++) {
      const company = mapped[i].company_name
      if (company.length < 3) continue
      const { data } = await insforge.database.rpc('search_duplicates', { p_company: company })
      if (data && (data as unknown[]).length > 0) mapped[i].dup = true
    }

    setRows(mapped)
    setParsing(false)
  }

  async function doImport() {
    const valid = rows.filter((r) => r.checked)
    if (valid.length === 0) return
    setImporting(true)
    setError('')
    const payload = valid.map(({ source_id, applied_date, current_status, ...r }) => ({
      ...r,
      source_id,
      applied_date,
      current_status,
    }))
    const { error: err } = await insforge.database.from('job_applications').insert(payload)
    setImporting(false)
    if (err) {
      setError(err.message)
      return
    }
    toast(`${valid.length} lamaran diimpor`)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line bg-surface p-10 text-stone shadow-card hover:border-trailblaze"
        >
          {parsing ? <Loader2 className="animate-spin" /> : <FileUp size={28} />}
          <span className="text-sm font-medium">{parsing ? 'Membaca file...' : 'Pilih file .xlsx atau .csv'}</span>
          <span className="text-xs">Kolom: company_name, role_title, applied_date, status, source</span>
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-stone">
            {rows.length} baris dibaca. Baris kuning terindikasi duplikat, uncheck bila tak ingin diimport.
          </p>
          <div className="max-h-96 overflow-auto card">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-xs uppercase tracking-wide text-stone">
                  <th className="p-2">Import</th>
                  <th className="p-2">Perusahaan</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Tanggal</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-t border-line ${r.dup ? 'bg-yellow-100/60' : ''}`}>
                    <td className="p-2">
                      <input type="checkbox" checked={r.checked} onChange={() => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))} />
                    </td>
                    <td className="p-2 font-medium text-ink">{r.company_name}{r.dup && <span className="ml-1 text-xs text-trailblaze">*</span>}</td>
                    <td className="p-2 text-stone">{r.role_title}</td>
                    <td className="p-2 font-mono text-stone">{r.applied_date}</td>
                    <td className="p-2">{r.current_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setRows([]); if (inputRef.current) inputRef.current.value = '' }} className="btn-secondary">Kembali</button>
            <button onClick={doImport} disabled={importing} className="btn-primary flex-1">
              {importing ? 'Mengimport...' : `Import ${rows.filter((r) => r.checked).length} lamaran`}
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      <Modal open={!!error} onClose={() => setError('')} title="Gagal import">
        <p className="text-sm text-ember">{error}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setError('')}
            className="rounded-lg bg-trailblaze px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Tutup
          </button>
        </div>
      </Modal>
    </div>
  )
}
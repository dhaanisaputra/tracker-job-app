'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { insforge } from '@/lib/browser-client'
import { STATUSES, EMPLOYMENT_TYPES, WORK_ARRANGEMENTS } from '@/lib/types'
import type { JobApplication, Source } from '@/lib/types'
import { Modal } from '@/components/modal'
import { toast } from '@/components/toast'
import { Dropdown } from '@/components/dropdown'
import { useLang } from '@/components/language-provider'
import { dateLocale } from '@/lib/i18n'

type Props = {
  sources: Source[]
  initial?: JobApplication | null
}

type Duplicate = {
  id: string
  company_name: string
  role_title: string
  applied_date: string
  current_status: string
}

const inputCls = 'field'
const labelCls = 'mb-1 block text-sm font-medium text-ink'

function AutosizeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function resize() {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`
  }

  useEffect(() => {
    resize()
  }, [])

  return <textarea {...props} ref={ref} onInput={resize} className={inputCls} />
}

export function ApplicationForm({ sources, initial }: Props) {
  const router = useRouter()
  const { t, lang } = useLang()
  const isEdit = Boolean(initial)
  const [submitting, setSubmitting] = useState(false)
  const [duplicates, setDuplicates] = useState<Duplicate[]>([])
  const [status, setStatus] = useState(initial?.current_status ?? 'Applied')
  const [sourceId, setSourceId] = useState(initial?.source_id ?? sources[0]?.id ?? '')
  const [employmentType, setEmploymentType] = useState(initial?.employment_type ?? '')
  const [workArrangement, setWorkArrangement] = useState(initial?.work_arrangement ?? '')
  const [jobUrl, setJobUrl] = useState(initial?.job_url ?? '')
  const [error, setError] = useState('')

  const jobUrlError = jobUrl !== '' && !/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/.test(jobUrl)
  const mandatoryMissing = employmentType === '' || workArrangement === ''

  // ponytail: plain debounce, no hook dep
  useEffect(() => {
    const company = (document.getElementById('company_name') as HTMLInputElement | null)?.value
    const t = setTimeout(async () => {
      if (!company || company.length < 3) {
        setDuplicates([])
        return
      }
      const { data, error: rpcErr } = await insforge.database.rpc('search_duplicates', {
        p_company: company,
      })
      if (!rpcErr) setDuplicates((data ?? []).filter((d: Duplicate) => d.id !== initial?.id))
    }, 500)
    return () => clearTimeout(t)
  }, [initial?.id])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const form = new FormData(e.currentTarget)

    if (jobUrlError) {
      setSubmitting(false)
      setError(t('form.urlError'))
      return
    }
    if (mandatoryMissing) {
      setSubmitting(false)
      setError(t('form.mandatoryError'))
      return
    }

    const payload: Record<string, unknown> = {
      company_name: form.get('company_name'),
      role_title: form.get('role_title'),
      source_id: sourceId,
      job_url: jobUrl || null,
      job_description: form.get('job_description') || null,
      location: form.get('location') || null,
      employment_type: employmentType || null,
      work_arrangement: workArrangement || null,
      salary_min: form.get('salary_min') ? Number(form.get('salary_min')) : null,
      salary_max: form.get('salary_max') ? Number(form.get('salary_max')) : null,
      applied_date: form.get('applied_date'),
      current_status: status,
      contact_person: form.get('contact_person') || null,
      notes: form.get('notes') || null,
      next_follow_up_date: form.get('next_follow_up_date') || null,
      interview_scheduled_at: form.get('interview_scheduled_at') || null,
      task_deadline: showTaskDeadline ? (form.get('task_deadline') || null) : null,
      offer_salary: form.get('offer_salary') ? Number(form.get('offer_salary')) : null,
      offer_deadline: form.get('offer_deadline') || null,
    }

    let result
    if (isEdit && initial) {
      const { error } = await insforge.database
        .from('job_applications')
        .update(payload)
        .eq('id', initial.id)
      result = error
    } else {
      const { error } = await insforge.database.from('job_applications').insert(payload)
      result = error
    }

    setSubmitting(false)
    if (result) {
      setError(result.message)
      return
    }
    toast(isEdit ? t('form.toastSaved') : t('form.toastCreated'))
    router.push('/dashboard')
    router.refresh()
  }

  const showInterview = status === 'HR Interview' || status === 'Technical Interview'
  const showOffer = status === 'Offer'
  const showTaskDeadline = status === 'Technical Interview'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-trailblaze/40 bg-trailblaze/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertTriangle size={16} className="text-trailblaze" />
            {t('form.dupTitle')}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {duplicates.map((d) => (
              <li key={d.id}>
                <span className="font-medium">{d.company_name}</span> - {d.role_title} (
                {new Date(d.applied_date).toLocaleDateString(dateLocale(lang), {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                , {t('form.dupStatus')}{d.current_status})
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-stone">{t('form.dupAsk')}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelCls}>{t('form.company')} <span className="text-ember">*</span></span>
          <input id="company_name" name="company_name" required defaultValue={initial?.company_name} className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>{t('form.role')} <span className="text-ember">*</span></span>
          <input name="role_title" required defaultValue={initial?.role_title} className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>{t('form.source')} <span className="text-ember">*</span></span>
          <Dropdown
            value={sourceId}
            options={sources.map((s) => ({ value: s.id, label: s.name }))}
            onChange={setSourceId}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>{t('form.jobUrl')}</span>
          <input
            type="text"
            name="job_url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            className={`${inputCls} ${jobUrlError ? 'border-ember' : ''}`}
            placeholder="https://..."
          />
          {jobUrlError && (
            <span className="mt-1 block text-xs text-ember">{t('form.urlHint')}</span>
          )}
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>{t('form.jobDesc')}</span>
          <AutosizeTextarea name="job_description" defaultValue={initial?.job_description ?? ''} placeholder={t('form.jobDescPh')} />
        </label>
        <label className="block">
          <span className={labelCls}>{t('form.location')}</span>
          <input name="location" defaultValue={initial?.location ?? ''} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>{t('form.empType')} <span className="text-ember">*</span></span>
          <Dropdown
            value={employmentType}
            options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t }))}
            onChange={setEmploymentType}
          />
          {employmentType === '' && (
            <span className="mt-1 block text-xs text-ember">{t('form.typeRequired')}</span>
          )}
        </label>
        <label className="block">
          <span className={labelCls}>{t('form.arrangement')} <span className="text-ember">*</span></span>
          <Dropdown
            value={workArrangement}
            options={WORK_ARRANGEMENTS.map((t) => ({ value: t, label: t }))}
            onChange={setWorkArrangement}
          />
          {workArrangement === '' && (
            <span className="mt-1 block text-xs text-ember">{t('form.arrRequired')}</span>
          )}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>{t('form.salaryMin')}</span>
            <input type="number" min="0" name="salary_min" defaultValue={initial?.salary_min ?? ''} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{t('form.salaryMax')}</span>
            <input type="number" min="0" name="salary_max" defaultValue={initial?.salary_max ?? ''} className={inputCls} />
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>{t('form.appliedDate')} <span className="text-ember">*</span></span>
          <input
            type="date"
            name="applied_date"
            required
            defaultValue={initial?.applied_date ?? new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t('form.statusNow')} <span className="text-ember">*</span></span>
          <Dropdown
            value={status}
            options={STATUSES.map((s) => ({ value: s, label: s }))}
            onChange={setStatus}
            placeholder={t('form.statusPh')}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>{t('form.recruiter')}</span>
          <input name="contact_person" defaultValue={initial?.contact_person ?? ''} className={inputCls} placeholder={t('form.recruiterPh')} />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>{t('form.notes')}</span>
          <AutosizeTextarea name="notes" defaultValue={initial?.notes ?? ''} />
        </label>
        <label className="block">
          <span className={labelCls}>{t('form.followup')}</span>
          <input type="date" name="next_follow_up_date" defaultValue={initial?.next_follow_up_date ?? ''} className={inputCls} />
        </label>
        {showInterview && (
          <label className="block">
            <span className={labelCls}>{t('form.interviewAt')}</span>
            <input
              type="datetime-local"
              name="interview_scheduled_at"
              defaultValue={initial?.interview_scheduled_at ? initial.interview_scheduled_at.slice(0, 16) : ''}
              className={inputCls}
            />
          </label>
        )}
        {showTaskDeadline && (
          <label className="block">
            <span className={labelCls}>{t('form.taskDeadline')}</span>
            <input
              type="datetime-local"
              name="task_deadline"
              defaultValue={initial?.task_deadline ? initial.task_deadline.slice(0, 16) : ''}
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-stone">
              {t('form.taskHint')}
            </span>
          </label>
        )}
        {showOffer && (
          <>
            <label className="block">
              <span className={labelCls}>{t('form.offerAmount')}</span>
              <input type="number" name="offer_salary" defaultValue={initial?.offer_salary ?? ''} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>{t('form.offerDeadline')}</span>
              <input type="date" name="offer_deadline" defaultValue={initial?.offer_deadline ?? ''} className={inputCls} />
            </label>
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? t('form.submitting') : isEdit ? t('form.saveEdit') : t('form.addNew')}
      </button>

      <Modal open={!!error} onClose={() => setError('')} title={t('form.saveFail')}>
        <p className="text-sm text-ember">{error}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setError('')}
            className="btn-primary"
          >
            {t('common.close')}
          </button>
        </div>
      </Modal>
    </form>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateProfile } from './actions'
import { signOut } from '@/app/auth-actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from '@/components/toast'
import { useLang } from '@/components/language-provider'
import type { UserSchema } from '@insforge/sdk'
import type { Profile } from '@/lib/types'

const inputCls = 'field'
const labelCls = 'mb-1 block text-sm font-medium text-ink'

function SubmitButton() {
  const { t } = useLang()
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full"
    >
      {pending ? t('akun.saving') : t('akun.saveProfile')}
    </button>
  )
}

export function ProfileForm({ user, profile }: { user: UserSchema | null; profile: Profile | null }) {
  const { t } = useLang()
  const initial = user?.profile?.name ?? profile?.full_name ?? ''
  const initialChar = (initial || user?.email || '?').charAt(0).toUpperCase()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [state, action, pending] = useActionState(updateProfile, undefined)

  useEffect(() => {
    if (state === undefined) return
    if (state.error) return
    toast(t('akun.toastSaved'))
  }, [state])

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-trailblaze/15 font-display text-2xl font-bold text-trailblaze">
            {initialChar}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-ink">{initial || t('akun.noName')}</p>
            <p className="truncate text-sm text-stone">{user?.email}</p>
          </div>
        </div>
      </section>

      <form action={action} className="card p-4">
        <h2 className="mb-4 font-display text-headline-sm text-ink">{t('akun.profileH')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelCls}>{t('akun.fullName')}</span>
            <input name="full_name" defaultValue={profile?.full_name ?? ''} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>{t('akun.targetRole')}</span>
            <input name="target_role" defaultValue={profile?.target_role ?? ''} className={inputCls} placeholder={t('akun.targetRolePh')} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>LinkedIn URL</span>
            <input type="url" name="linkedin_url" defaultValue={profile?.linkedin_url ?? ''} className={inputCls} placeholder="https://linkedin.com/in/..." />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Portfolio URL</span>
            <input type="url" name="portfolio_url" defaultValue={profile?.portfolio_url ?? ''} className={inputCls} placeholder="https://..." />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>{t('akun.targetSalary')}</span>
            <input type="number" name="salary_expectation" defaultValue={profile?.salary_expectation ?? ''} className={inputCls} placeholder={t('akun.salaryPh')} />
          </label>
        </div>
        {state?.error && <p className="mt-3 text-sm text-ember">{state.error}</p>}
        <div className="mt-4">
          <SubmitButton />
        </div>
      </form>

      {/* Logout: desktop via sidebar; mobile only here */}
      <button type="button" onClick={() => setConfirmLogout(true)} className="btn-danger w-full md:hidden">
        {t('akun.logoutCta')}
      </button>
      <ConfirmDialog
        open={confirmLogout}
        title={t('nav.logoutTitle')}
        message={t('nav.logoutMsg')}
        confirmLabel={t('akun.logoutCta')}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false)
          signOut()
        }}
      />
    </div>
  )
}

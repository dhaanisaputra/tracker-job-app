'use client'

import { Suspense, useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { verifyOtp, resendOtp } from '@/app/auth-actions'
import { ArrowLeft, RefreshCcw } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'

const OTP_TTL = 300 // kode berlaku 5 menit (InsForge)

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

function CodeForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [state, action, pending] = useActionState(verifyOtp, undefined)
  const [resendState, resendAction, resendPending] = useActionState(resendOtp, undefined)
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL)

  useEffect(() => {
    setSecondsLeft(OTP_TTL)
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])

  // reset countdown after resend success
  useEffect(() => {
    if (resendState?.message) setSecondsLeft(OTP_TTL)
  }, [resendState])

  const expired = secondsLeft === 0

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <BrandMark size={22} />
          <span className="bg-gradient-to-r from-[#3a5cd9] to-[#2f7fa8] bg-clip-text text-sm font-semibold text-transparent">Lamaranku</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Cek email kamu</h1>
        <p className="text-sm text-stone mb-6">
          Kode 6 digit sudah dikirim ke <span className="font-medium text-ink">{email}</span>
        </p>

        <form action={action} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Kode masuk</span>
            <input
              type="text"
              name="otp"
              required
              autoFocus
              inputMode="numeric"
              maxLength={6}
              className="field text-center font-mono text-2xl tracking-[0.5em]"
              placeholder="000000"
            />
          </label>

          {state?.error && <p className="text-sm text-ember">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full"
          >
            {pending ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
          <form action={resendAction}>
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              disabled={!expired || resendPending}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-trailblaze/40 hover:text-trailblaze disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCcw size={14} />
              {resendPending ? 'Mengirim...' : expired ? 'Kirim Ulang Kode' : 'Kirim ulang dalam ' + formatTime(secondsLeft)}
            </button>
          </form>
          {resendState?.message && <p className="text-sm text-trailblaze">{resendState.message}</p>}
          {resendState?.error && <p className="text-sm text-ember">{resendState.error}</p>}

          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-stone transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            Kembali ke masuk
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function SignInCodePage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center text-sm text-stone">Memuat...</main>}>
      <CodeForm />
    </Suspense>
  )
}

'use client'

import { Suspense, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { verifyOtp } from '@/app/auth-actions'

function CodeForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [state, action, pending] = useActionState(verifyOtp, undefined)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-3 w-3 rounded-full bg-trailblaze" />
          <span className="text-sm font-semibold text-stone">Lamaranku</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Cek email kamu</h1>
        <p className="text-sm text-stone mb-8">
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
              className="w-full rounded-lg border border-stone/40 bg-white px-3 py-2 text-center font-mono text-2xl tracking-[0.5em] text-ink outline-none focus:border-trailblaze"
              placeholder="000000"
            />
          </label>

          {state?.error && <p className="text-sm text-ember">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-trailblaze px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>
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
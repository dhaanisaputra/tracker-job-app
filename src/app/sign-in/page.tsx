'use client'

import { useActionState } from 'react'
import { sendOtp } from '@/app/auth-actions'

export default function SignInPage() {
  const [state, action, pending] = useActionState(sendOtp, undefined)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-3 w-3 rounded-full bg-trailblaze" />
          <span className="text-sm font-semibold text-stone">Lamaranku</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Masuk untuk melacak lamaran</h1>
        <p className="text-sm text-stone mb-8">
          Masukkan email kamu, kami kirim kode masuk sekali pakai.
        </p>

        <form action={action} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="field"
              placeholder="kamu@contoh.com"
            />
          </label>

          {state?.error && <p className="text-sm text-ember">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full"
          >
            {pending ? 'Mengirim...' : 'Kirim kode masuk'}
          </button>
        </form>
      </div>
    </main>
  )
}
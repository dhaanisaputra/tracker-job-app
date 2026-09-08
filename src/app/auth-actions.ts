'use server'

import { cookies } from 'next/headers'
import { createAuthActions } from '@insforge/sdk/ssr'
import { redirect } from 'next/navigation'
import { getServerLang } from '@/lib/server-lang'
import { getDict } from '@/lib/i18n'

export async function sendOtp(prev: { error?: string; message?: string } | undefined, formData: FormData) {
  const t = getDict(await getServerLang())
  const email = String(formData.get('email') ?? '')
  if (!email) return { error: t['auth.emailRequired'] }

  const auth = createAuthActions({ cookies: await cookies() })
  const { error } = await auth.signInWithOtp({ email })

  if (error) return { error: error.message }

  redirect(`/sign-in/code?email=${encodeURIComponent(email)}`)
}

export async function verifyOtp(prev: { error?: string } | undefined, formData: FormData) {
  const t = getDict(await getServerLang())
  const email = String(formData.get('email') ?? '')
  const otp = String(formData.get('otp') ?? '')

  const auth = createAuthActions({ cookies: await cookies() })
  const { data, error } = await auth.verifyOtp({ email, otp })

  if (error) return { error: error.message }
  if (!data?.user) return { error: t['auth.verifyFail'] }

  redirect('/dashboard')
}

export async function resendOtp(prev: { error?: string; message?: string } | undefined, formData: FormData) {
  const t = getDict(await getServerLang())
  const email = String(formData.get('email') ?? '')
  if (!email) return { error: t['auth.emailRequired'] }

  const auth = createAuthActions({ cookies: await cookies() })
  const { error } = await auth.signInWithOtp({ email })

  if (error) return { error: error.message }

  return { message: t['auth.resentOk'] }
}

export async function signOut() {
  const auth = createAuthActions({ cookies: await cookies() })
  await auth.signOut()
  redirect('/sign-in')
}
'use server'

import { cookies } from 'next/headers'
import { createAuthActions } from '@insforge/sdk/ssr'
import { redirect } from 'next/navigation'

export async function sendOtp(prev: { error?: string; message?: string } | undefined, formData: FormData) {
  const email = String(formData.get('email') ?? '')
  if (!email) return { error: 'Email is required' }

  const auth = createAuthActions({ cookies: await cookies() })
  const { error } = await auth.signInWithOtp({ email })

  if (error) return { error: error.message }

  redirect(`/sign-in/code?email=${encodeURIComponent(email)}`)
}

export async function verifyOtp(prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const otp = String(formData.get('otp') ?? '')

  const auth = createAuthActions({ cookies: await cookies() })
  const { data, error } = await auth.verifyOtp({ email, otp })

  if (error) return { error: error.message }
  if (!data?.user) return { error: 'Sign-in failed' }

  redirect('/dashboard')
}

export async function signOut() {
  const auth = createAuthActions({ cookies: await cookies() })
  await auth.signOut()
  redirect('/sign-in')
}
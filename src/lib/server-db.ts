import { cookies } from 'next/headers'
import { createServerClient } from '@insforge/sdk/ssr'

export async function serverClient() {
  return createServerClient({ cookies: await cookies() })
}

export async function serverDb() {
  return (await serverClient()).database
}
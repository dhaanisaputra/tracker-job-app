import { createClient } from '@insforge/sdk'

const url = process.env.NEXT_PUBLIC_INSFORGE_URL
const key = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

if (!url || !key) {
  throw new Error('InsForge URL and ANON_KEY must be set in environment')
}

export const insforge = createClient({
  baseUrl: url,
  anonKey: key,
})
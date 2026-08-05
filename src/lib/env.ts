const missing = []
if (!process.env.NEXT_PUBLIC_INSFORGE_URL) missing.push('NEXT_PUBLIC_INSFORGE_URL')
if (!process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) missing.push('NEXT_PUBLIC_INSFORGE_ANON_KEY')

export const ENV = {
  INSFORGE_URL: process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://5fr37au2.ap-southeast.insforge.app',
  INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_86ee232cd8bb3128bf814404e1c9b2e7',
}

if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`)
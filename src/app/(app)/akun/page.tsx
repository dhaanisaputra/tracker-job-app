import { getCurrentUser } from '@/lib/server-user'
import { serverDb } from '@/lib/server-db'
import { ProfileForm } from './profile-form'
import { PageHeader } from '@/components/page-header'
import { getServerLang } from '@/lib/server-lang'
import { getDict } from '@/lib/i18n'
import type { Profile } from '@/lib/types'

export default async function AccountPage() {
  const user = await getCurrentUser()

  const { data } = await (await serverDb()).from('profiles').select('*').eq('id', user?.id).maybeSingle()
  const profile = (data ?? null) as Profile | null
  const t = getDict(await getServerLang())

  return (
    <main className="p-4">
      <PageHeader title={t['akun.title']} description={t['akun.desc']} />
      <ProfileForm user={user} profile={profile} />
    </main>
  )
}

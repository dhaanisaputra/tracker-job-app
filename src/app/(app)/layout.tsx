import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/server-user'
import { Nav } from '@/components/nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  return (
    <div className="mx-auto w-full max-w-5xl pb-20 md:pb-0">
      <div className="md:pl-56">{children}</div>
      <Nav />
    </div>
  )
}
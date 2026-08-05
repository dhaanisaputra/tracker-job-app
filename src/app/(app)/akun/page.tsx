import { getCurrentUser } from '@/lib/server-user'
import { signOut } from '@/app/auth-actions'

export default async function AccountPage() {
  const user = await getCurrentUser()

  return (
    <main className="p-4">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">Akun</h1>
      </header>

      <div className="space-y-6">
        <section className="rounded-xl border border-stone/30 bg-white p-4">
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-stone">Profil</h2>
          <p className="text-sm text-ink">{user?.email}</p>
        </section>

        <form action={signOut}>
          <button type="submit" className="w-full rounded-lg bg-ember px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            Keluar
          </button>
        </form>
      </div>
    </main>
  )
}
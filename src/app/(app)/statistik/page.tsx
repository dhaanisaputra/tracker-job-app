import { Charts } from '@/components/charts'
import { getDashboardStats } from '@/lib/stats'

export default async function StatistikPage() {
  const stats = await getDashboardStats()

  return (
    <main className="p-4">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">Statistik</h1>
        <p className="text-sm text-stone">Tren dan pergerakan lamaranmu.</p>
      </header>
      <Charts growth={stats.growth} successRate={stats.successRate} distribution={stats.distribution} />
    </main>
  )
}
'use client'

import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend)

const grid = { color: 'rgba(139,136,127,0.15)' }

export function Charts({ growth, successRate, distribution }: {
  growth: { labels: string[]; values: number[] }
  successRate: { labels: string[]; values: number[] }
  distribution: { labels: string[]; values: number[] }
}) {
  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-stone/30 bg-white p-4">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-stone">Applications Growth</h2>
        <Line
          data={{
            labels: growth.labels.map((l) => new Date(l).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })),
            datasets: [{ label: 'Lamaran', data: growth.values, borderColor: '#FF7A33', backgroundColor: 'rgba(255,122,51,0.15)', tension: 0.3, fill: true }],
          }}
          options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: grid }, y: { grid: grid, beginAtZero: true, ticks: { stepSize: 1 } } } }}
        />
      </section>

      <section className="rounded-xl border border-stone/30 bg-white p-4">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-stone">Success rate per tahap</h2>
        <Bar
          data={{
            labels: successRate.labels,
            datasets: [{ label: '% pernah mencapai', data: successRate.values, backgroundColor: '#2E6E8E', borderRadius: 4 }],
          }}
          options={{ indexAxis: 'y' as const, responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: grid, beginAtZero: true, max: 100 }, y: { grid: { display: false } } } }}
        />
      </section>

      <section className="rounded-xl border border-stone/30 bg-white p-4">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-stone">Distribusi sumber</h2>
        <Doughnut
          data={{
            labels: distribution.labels,
            datasets: [{ data: distribution.values, backgroundColor: ['#FF7A33', '#1F7A5C', '#2E6E8E', '#D14343', '#8B887F', '#D9A441'] }],
          }}
          options={{ responsive: true, plugins: { legend: { position: 'bottom' as const } } }}
        />
      </section>
    </div>
  )
}
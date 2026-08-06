'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js'
import { Card } from '@/components/card'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

export function MomentumChart({ labels, values }: { labels: string[]; values: number[] }) {
  return (
    <Card title="Kemiringan Lamaran" subtitle="Lamaran per periode.">
      <div className="h-64">
        <Line
          data={{
            labels,
            datasets: [{
              label: 'Lamaran',
              data: values,
              borderColor: '#FF7A33',
              backgroundColor: 'rgba(255,122,51,0.15)',
              tension: 0.3,
              fill: true,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: 'rgba(139,136,127,0.15)' } },
              y: { grid: { color: 'rgba(139,136,127,0.15)' }, beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
            },
          }}
        />
      </div>
    </Card>
  )
}
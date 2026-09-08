'use client'

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js'
import { Card } from '@/components/card'
import { useLang } from '@/components/language-provider'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

function useCssVar(name: string, fallback: string) {
  const [val, setVal] = useState(fallback)
  useEffect(() => {
    const read = () => setVal(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback)
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [name, fallback])
  return val
}

function hexToRgba(hex: string, alpha: number) {
  const m = hex.match(/^#?([0-9a-f]{6})$/i)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

export function MomentumChart({ labels, values }: { labels: string[]; values: number[] }) {
  const { t } = useLang()
  const line = useCssVar('--line', '#e3e7ee')
  const stone = useCssVar('--stone', '#5b6478')
  const grid = hexToRgba(line, 0.5)

  return (
    <Card title={t('stats.trend')} subtitle={t('stats.trendSub')}>
      <div className="h-64">
        <Line
          data={{
            labels,
            datasets: [{
              label: t('stats.dataset'),
              data: values,
              borderColor: '#3a5cd9',
              backgroundColor: 'rgba(58,92,217,0.12)',
              tension: 0.3,
              fill: true,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: grid }, ticks: { color: stone } },
              y: { grid: { color: grid }, beginAtZero: true, ticks: { stepSize: 1, precision: 0, color: stone } },
            },
          }}
        />
      </div>
    </Card>
  )
}
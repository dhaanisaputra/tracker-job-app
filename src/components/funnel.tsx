const stageColors = ['#FF7A33', '#2E6E8E', '#1F7A5C', '#226584', '#8B887F', '#D9A441']

export function Funnel({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <h2 className="font-display text-headline-sm text-ink">Funnel Velocity</h2>
      <div className="mt-4 flex flex-col justify-center gap-3">
        {labels.map((label, i) => (
          <div key={label}>
            <div className="mb-1 flex justify-between font-mono text-xs">
              <span className="text-ink">{label}</span>
              <span className="text-stone">{values[i]}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-stone/10">
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.round((values[i] / max) * 100)}%`, backgroundColor: stageColors[i % stageColors.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
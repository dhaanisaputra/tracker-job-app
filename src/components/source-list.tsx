const dotColors = ['#FF7A33', '#1F7A5C', '#2E6E8E', '#D14343', '#8B887F', '#D9A441']

export function SourceList({ items }: { items: { name: string; value: number }[] }) {
  const total = items.reduce((acc, i) => acc + i.value, 0)
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <h2 className="font-display text-headline-sm text-ink">Origin Vectors</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-stone">Belum ada data sumber.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item, i) => (
            <li key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dotColors[i % dotColors.length] }} />
                <span className="text-body-md text-ink">{item.name}</span>
              </div>
              <span className="text-stat-lg text-lg text-ink">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
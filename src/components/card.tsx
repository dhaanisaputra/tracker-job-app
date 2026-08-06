export function Card({ title, subtitle, action, children, className }: {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 shadow-card ${className ?? ''}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            {title && <h2 className="font-display text-headline-sm text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-stone">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

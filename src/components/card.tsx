export function Card({ title, subtitle, action, children, className }: {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`card p-4 ${className ?? ''}`}>
      {(title || action) && (
        <div className="mb-3.5 flex items-start justify-between gap-2 border-b border-line pb-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-stone">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
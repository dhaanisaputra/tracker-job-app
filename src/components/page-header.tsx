export function PageHeader({ title, description, children }: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-display-sm font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-body-md text-stone">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
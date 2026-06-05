interface CurriculoSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  empty?: boolean
  emptyMessage?: string
}

export function CurriculoSection({
  title,
  icon,
  children,
  empty,
  emptyMessage = 'Nenhuma informação encontrada.',
}: CurriculoSectionProps) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 text-ink-subtle border-b border-hairline pb-2 mb-4">
        {icon}
        <h3 className="text-sm font-semibold tracking-wider uppercase text-ink-muted">{title}</h3>
      </div>
      {empty ? (
        <p className="text-sm text-ink-tertiary italic">{emptyMessage}</p>
      ) : (
        children
      )}
    </div>
  )
}

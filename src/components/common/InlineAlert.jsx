export function InlineAlert({ title, children, tone = 'warning' }) {
  const styles =
    tone === 'error'
      ? 'border-red-500/50 bg-red-950/40 text-red-100'
      : 'border-amber-500/50 bg-amber-950/30 text-amber-50'

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <p className="text-sm opacity-95">{children}</p>
    </div>
  )
}

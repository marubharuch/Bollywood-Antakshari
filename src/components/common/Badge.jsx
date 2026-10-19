const tones = {
  idle: 'bg-slate-600 text-slate-100',
  ready: 'bg-sky-600 text-white',
  active: 'bg-rose-600 text-white',
  demo: 'bg-amber-600/90 text-white',
  live: 'bg-emerald-600 text-white',
  paused: 'bg-slate-500 text-white',
  dev: 'bg-violet-700 text-white',
  on: 'bg-violet-600 text-white',
  off: 'bg-slate-700 text-slate-200',
}

export function Badge({ children, tone = 'idle', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${tones[tone] ?? tones.idle} ${className}`}
    >
      {children}
    </span>
  )
}

const variants = {
  primary:
    'bg-rose-600 hover:bg-rose-500 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed',
  outline:
    'border border-slate-500 text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed',
  gold:
    'bg-[var(--color-gold)] hover:bg-[var(--color-gold-dim)] text-slate-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed',
}

const sizes = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-sm',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  pressed = false,
  className = '',
  ...props
}) {
  const pressedRing = pressed
    ? 'ring-2 ring-rose-400/80 ring-offset-1 ring-offset-slate-900'
    : ''

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 ${variants[variant]} ${sizes[size]} ${pressedRing} ${className}`}
      aria-pressed={pressed ? true : undefined}
      {...props}
    >
      {children}
    </button>
  )
}

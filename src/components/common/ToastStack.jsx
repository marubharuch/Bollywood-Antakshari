const toneStyles = {
  info: 'border-slate-600 bg-slate-800 text-slate-100',
  success: 'border-emerald-600/60 bg-emerald-950/90 text-emerald-50',
  warning: 'border-amber-600/60 bg-amber-950/90 text-amber-50',
  error: 'border-red-600/60 bg-red-950/90 text-red-50',
}

export function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null

  return (
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-50 flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg ${toneStyles[toast.tone] ?? toneStyles.info}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p>{toast.message}</p>
            <button
              type="button"
              className="shrink-0 text-xs opacity-70 hover:opacity-100"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

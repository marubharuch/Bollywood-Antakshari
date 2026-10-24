import { useEffect, useId } from 'react'

/**
 * Accessible modal shell for question add/edit. Body scrolls; footer stays fixed.
 */
export function QuestionEditModal({
  open,
  title,
  onRequestClose,
  children,
  footer,
  errorBanner,
}) {
  const titleId = useId()
  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onRequestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onRequestClose])

  if (!open) return null

  const handleBackdropClick = () => {
    onRequestClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={handleBackdropClick}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,42rem)] w-full max-w-lg min-w-0 flex-col overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-700 px-4 py-3">
          <h3 id={titleId} className="text-sm font-semibold text-amber-100">
            {title}
          </h3>
          <button
            type="button"
            autoFocus
            className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800"
            aria-label="Close"
            onClick={onRequestClose}
          >
            ✕
          </button>
        </div>

        {errorBanner && (
          <div className="shrink-0 border-b border-red-500/30 bg-red-950/50 px-4 py-2 text-xs text-red-200">
            {errorBanner}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
          {children}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-700 bg-slate-900/95 px-4 py-3">
          {footer}
        </div>
      </div>
    </div>
  )
}

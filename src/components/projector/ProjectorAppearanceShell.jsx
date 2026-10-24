import { useRef } from 'react'
import { useProjectorAppearance } from '../../hooks/useProjectorAppearance.js'
import '../projector/projectorLayout.css'

/**
 * Wraps projector UI with viewport layout + appearance tokens (projector route / preview only).
 */
export function ProjectorAppearanceShell({
  settings,
  embedded = false,
  className = '',
  rootRef: externalRootRef,
  children,
}) {
  const internalRef = useRef(null)
  const rootRef = externalRootRef ?? internalRef
  useProjectorAppearance(rootRef, settings)

  return (
    <div
      ref={rootRef}
      className={`projector-root bg-[var(--color-cinema-bg)] text-white ${
        embedded ? 'projector-root--embedded projector-embed-host' : ''
      } ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3b0764_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_#7f1d1d_0%,_transparent_45%)] opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
        }}
        aria-hidden
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

import { useEffect } from 'react'

const CLASS = 'projector-route-active'

/** Locks document scroll on standalone projector tab; no-op when embedded in split test. */
export function useProjectorViewportLock(embedded) {
  useEffect(() => {
    if (embedded) return undefined
    document.documentElement.classList.add(CLASS)
    return () => {
      document.documentElement.classList.remove(CLASS)
    }
  }, [embedded])
}

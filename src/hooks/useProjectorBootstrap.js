import { useEffect, useRef } from 'react'
import { gameStateStore } from '../state/gameStateStore.js'

/**
 * Hydrate projector from localStorage and avoid autoplay after reload/open.
 */
export function useProjectorBootstrap({ embedded = false, onPausedForReload }) {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (embedded) {
      gameStateStore.rehydrateFromPersistence()
      return
    }
    const { pausedForReload } = gameStateStore.prepareProjectorSession()
    if (pausedForReload) {
      onPausedForReload?.()
    }
  }, [embedded, onPausedForReload])
}

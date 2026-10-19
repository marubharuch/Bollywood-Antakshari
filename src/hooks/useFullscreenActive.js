import { useSyncExternalStore } from 'react'

function subscribeFullscreen(callback) {
  document.addEventListener('fullscreenchange', callback)
  return () => document.removeEventListener('fullscreenchange', callback)
}

function getFullscreenSnapshot() {
  return Boolean(document.fullscreenElement)
}

export function useFullscreenActive() {
  return useSyncExternalStore(
    subscribeFullscreen,
    getFullscreenSnapshot,
    () => false,
  )
}

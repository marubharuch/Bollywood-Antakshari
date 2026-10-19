import { useSyncExternalStore } from 'react'

function subscribeOnline(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, getOnlineSnapshot, () => true)
}

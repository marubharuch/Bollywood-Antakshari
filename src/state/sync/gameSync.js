import {
  SYNC_CHANNEL_NAME,
  SYNC_STORAGE_EVENT,
  SYNC_STORAGE_KEY,
} from '../constants.js'

let channel = null

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') {
    return null
  }
  if (!channel) {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME)
  }
  return channel
}

/**
 * Publish state to other tabs/windows.
 * @param {object} state
 * @param {{ origin?: string }} meta
 */
export function publishGameState(state, meta = {}) {
  const payload = {
    type: 'GAME_STATE',
    state,
    origin: meta.origin ?? 'unknown',
    ts: Date.now(),
  }

  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(
      new CustomEvent(SYNC_STORAGE_EVENT, { detail: payload }),
    )
  } catch {
    // Quota or private mode — BroadcastChannel may still work
  }

  const bc = getChannel()
  if (bc) {
    bc.postMessage(payload)
  }
}

/**
 * @param {(payload: { state: object }) => void} listener
 * @returns {() => void}
 */
export function subscribeToGameSync(listener) {
  const bc = getChannel()

  const onMessage = (event) => {
    const data = event.data
    if (data?.type === 'GAME_STATE' && data.state) {
      listener({ state: data.state, origin: data.origin })
    }
  }

  const onStorage = (event) => {
    if (event.key !== SYNC_STORAGE_KEY || !event.newValue) return
    try {
      const state = JSON.parse(event.newValue)
      listener({ state, origin: 'localStorage' })
    } catch {
      // ignore corrupt payload
    }
  }

  const onCustom = (event) => {
    const data = event.detail
    if (data?.type === 'GAME_STATE' && data.state) {
      listener({ state: data.state, origin: data.origin })
    }
  }

  if (bc) {
    bc.addEventListener('message', onMessage)
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(SYNC_STORAGE_EVENT, onCustom)

  return () => {
    if (bc) {
      bc.removeEventListener('message', onMessage)
    }
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(SYNC_STORAGE_EVENT, onCustom)
  }
}

/**
 * Hydrate from localStorage on first load.
 * @returns {object | null}
 */
export function loadPersistedGameState() {
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

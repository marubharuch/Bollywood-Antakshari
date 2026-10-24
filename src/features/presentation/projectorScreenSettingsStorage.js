import {
  DEFAULT_PROJECTOR_SCREEN_SETTINGS,
  normalizeProjectorScreenSettings,
  PROJECTOR_SETTINGS_STORAGE_KEY,
} from './projectorScreenSettingsModel.js'

export function loadProjectorScreenSettings() {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_PROJECTOR_SCREEN_SETTINGS }
  }
  try {
    const raw = localStorage.getItem(PROJECTOR_SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PROJECTOR_SCREEN_SETTINGS }
    return normalizeProjectorScreenSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PROJECTOR_SCREEN_SETTINGS }
  }
}

/**
 * @param {import('./projectorScreenSettingsModel.js').ProjectorScreenSettings} settings
 */
export function saveProjectorScreenSettings(settings) {
  const normalized = normalizeProjectorScreenSettings(settings)
  if (typeof localStorage === 'undefined') return normalized
  localStorage.setItem(PROJECTOR_SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('projector-settings-updated'))
  }
  return normalized
}

export function clearProjectorScreenSettingsStorage() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(PROJECTOR_SETTINGS_STORAGE_KEY)
}

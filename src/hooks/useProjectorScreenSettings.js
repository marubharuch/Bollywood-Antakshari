import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_PROJECTOR_SCREEN_SETTINGS } from '../features/presentation/projectorScreenSettingsModel.js'
import {
  loadProjectorScreenSettings,
  saveProjectorScreenSettings,
} from '../features/presentation/projectorScreenSettingsStorage.js'
import { PROJECTOR_SETTINGS_STORAGE_KEY } from '../features/presentation/projectorScreenSettingsModel.js'

export function useProjectorScreenSettings() {
  const [settings, setSettings] = useState(() => loadProjectorScreenSettings())

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== PROJECTOR_SETTINGS_STORAGE_KEY) return
      setSettings(loadProjectorScreenSettings())
    }
    const onCustom = () => setSettings(loadProjectorScreenSettings())
    window.addEventListener('storage', onStorage)
    window.addEventListener('projector-settings-updated', onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('projector-settings-updated', onCustom)
    }
  }, [])

  const saveSettings = useCallback((next) => {
    const saved = saveProjectorScreenSettings(next)
    setSettings(saved)
    return saved
  }, [])

  const resetToDefaults = useCallback(() => {
    const saved = saveProjectorScreenSettings(DEFAULT_PROJECTOR_SCREEN_SETTINGS)
    setSettings(saved)
    return saved
  }, [])

  const reloadFromStorage = useCallback(() => {
    setSettings(loadProjectorScreenSettings())
  }, [])

  return {
    settings,
    setSettings,
    saveSettings,
    resetToDefaults,
    reloadFromStorage,
  }
}

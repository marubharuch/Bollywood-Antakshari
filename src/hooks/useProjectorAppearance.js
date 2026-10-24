import { useEffect } from 'react'
import {
  PROJECTOR_SCREEN_FIT,
  SCREEN_FIT_REFERENCE,
} from '../features/presentation/projectorScreenSettingsModel.js'

/**
 * Applies projector-only appearance tokens to the root element and tracks viewport scale.
 * @param {import('react').RefObject<HTMLElement | null>} rootRef
 * @param {import('../features/presentation/projectorScreenSettingsModel.js').ProjectorScreenSettings} settings
 */
export function useProjectorAppearance(rootRef, settings) {
  useEffect(() => {
    const el = rootRef.current
    if (!el || !settings) return undefined

    el.dataset.projectorFit = settings.screenFit
    el.dataset.projectorText = settings.textSize
    el.dataset.projectorLayout = settings.layoutDensity
    el.dataset.projectorMargin = settings.safeMargin
    el.dataset.projectorCols = settings.scoreColumns
    el.dataset.projectorContrast = settings.highContrast ? 'high' : 'normal'

    return () => {
      delete el.dataset.projectorFit
      delete el.dataset.projectorText
      delete el.dataset.projectorLayout
      delete el.dataset.projectorMargin
      delete el.dataset.projectorCols
      delete el.dataset.projectorContrast
    }
  }, [rootRef, settings])

  useEffect(() => {
    const el = rootRef.current
    if (!el || !settings) return undefined

    const updateScale = () => {
      if (settings.screenFit === PROJECTOR_SCREEN_FIT.AUTO) {
        el.style.setProperty('--pj-profile-scale', '1')
        el.style.removeProperty('--pj-ref-width')
        el.style.removeProperty('--pj-ref-height')
        return
      }
      const ref = SCREEN_FIT_REFERENCE[settings.screenFit]
      if (!ref) {
        el.style.setProperty('--pj-profile-scale', '1')
        return
      }
      const w = el.clientWidth || 1
      const h = el.clientHeight || 1
      const scale = Math.min(w / ref.width, h / ref.height, 1.15)
      el.style.setProperty('--pj-profile-scale', String(scale))
      el.style.setProperty('--pj-ref-width', `${ref.width}px`)
      el.style.setProperty('--pj-ref-height', `${ref.height}px`)
    }

    updateScale()
    const ro = new ResizeObserver(() => updateScale())
    ro.observe(el)
    return () => ro.disconnect()
  }, [rootRef, settings?.screenFit])
}

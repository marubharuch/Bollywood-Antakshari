import { useEffect } from 'react'
import { useGameState } from './useGameState.js'
import { isScoreAnnouncementActive } from '../features/presentation/scoreAnnouncementModel.js'

/**
 * Clears expired score announcements in shared state (synced to projector).
 */
export function useScoreAnnouncementExpiry() {
  const { state, clearScoreAnnouncement } = useGameState()
  const announcement = state.scoreAnnouncement

  useEffect(() => {
    if (!announcement?.token || !announcement?.showUntil) return
    if (!isScoreAnnouncementActive(announcement)) {
      clearScoreAnnouncement(announcement.token)
      return
    }
    const remain = announcement.showUntil - Date.now()
    const id = window.setTimeout(() => {
      clearScoreAnnouncement(announcement.token)
    }, remain)
    return () => window.clearTimeout(id)
  }, [announcement, clearScoreAnnouncement])
}

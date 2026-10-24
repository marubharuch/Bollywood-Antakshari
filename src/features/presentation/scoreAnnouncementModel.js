/** Temporary projector toast after a score change (not the manual scoreboard). */
export const SCORE_ANNOUNCEMENT_MS = 5_000

/**
 * @param {object | null | undefined} raw
 */
export function normalizeScoreAnnouncement(raw) {
  if (!raw || typeof raw !== 'object') return null
  const token = typeof raw.token === 'string' ? raw.token : null
  if (!token) return null
  const teamId = typeof raw.teamId === 'string' ? raw.teamId : null
  const teamName = typeof raw.teamName === 'string' ? raw.teamName : 'Team'
  const delta = typeof raw.delta === 'number' && Number.isFinite(raw.delta) ? raw.delta : 0
  const total = typeof raw.total === 'number' && Number.isFinite(raw.total) ? raw.total : 0
  const showUntil =
    typeof raw.showUntil === 'number' && Number.isFinite(raw.showUntil) ? raw.showUntil : 0
  if (showUntil <= 0) return null
  const projectorVisible = raw.projectorVisible !== false
  return { token, teamId, teamName, delta, total, showUntil, projectorVisible }
}

export function isScoreAnnouncementActive(announcement) {
  return (
    Boolean(announcement?.token) &&
    typeof announcement.showUntil === 'number' &&
    announcement.showUntil > Date.now()
  )
}

export function createScoreAnnouncement({ teamId, teamName, delta, total }) {
  const now = Date.now()
  return normalizeScoreAnnouncement({
    token: `sa-${now}-${teamId ?? 'team'}`,
    teamId,
    teamName,
    delta,
    total,
    showUntil: now + SCORE_ANNOUNCEMENT_MS,
    projectorVisible: true,
  })
}

export function isScoreAnnouncementProjectorVisible(announcement) {
  return isScoreAnnouncementActive(announcement) && announcement.projectorVisible !== false
}

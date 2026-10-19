import { normalizeGameState } from './initialGameState.js'
import { normalizeMediaLibrary, normalizeMediaPlayback } from '../features/media/mediaModel.js'
import { normalizeRoundLibrary } from '../features/rounds/roundModel.js'
import { normalizeTeamsList } from '../features/tournament/teamModel.js'

/**
 * Merge remote/persisted payload into the current in-memory state without
 * dropping slices that are missing from a partial payload.
 * @param {object} current
 * @param {object | null | undefined} incoming
 */
export function mergeRemoteGameState(current, incoming) {
  if (!incoming || typeof incoming !== 'object') {
    return normalizeGameState(current)
  }

  const merged = {
    ...current,
    ...incoming,
    question: { ...(current.question ?? {}), ...(incoming.question ?? {}) },
    buzzer: { ...(current.buzzer ?? {}), ...(incoming.buzzer ?? {}) },
    mediaPlayback: {
      ...normalizeMediaPlayback(current.mediaPlayback),
      ...(incoming.mediaPlayback ?? {}),
    },
    teams: Array.isArray(incoming.teams)
      ? normalizeTeamsList(incoming.teams, current.teams)
      : current.teams,
    mediaLibrary: Array.isArray(incoming.mediaLibrary)
      ? normalizeMediaLibrary(incoming.mediaLibrary)
      : current.mediaLibrary,
    roundLibrary: Object.prototype.hasOwnProperty.call(incoming, 'roundLibrary')
      ? normalizeRoundLibrary(incoming.roundLibrary, current.roundLibrary ?? [])
      : current.roundLibrary,
    selectedRoundId:
      typeof incoming.selectedRoundId === 'string'
        ? incoming.selectedRoundId
        : current.selectedRoundId,
    updatedAt: incoming.updatedAt ?? current.updatedAt ?? Date.now(),
  }

  return normalizeGameState(merged)
}

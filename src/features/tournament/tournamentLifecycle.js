import { ROUND_PLAY_STATUS } from './tournamentModel.js'

export const TOURNAMENT_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  COMPLETED: 'completed',
}

const ACTIVE_SESSION = new Set([
  TOURNAMENT_STATUS.IN_PROGRESS,
  TOURNAMENT_STATUS.PAUSED,
  TOURNAMENT_STATUS.STOPPED,
])

export function normalizeTournamentStatus(status) {
  const allowed = Object.values(TOURNAMENT_STATUS)
  return allowed.includes(status) ? status : TOURNAMENT_STATUS.DRAFT
}

export function allPlannedRoundsSettled(tournament) {
  const rounds = tournament?.plannedRounds ?? []
  if (!rounds.length) return false
  return rounds.every(
    (p) =>
      p.roundStatus === ROUND_PLAY_STATUS.COMPLETED ||
      p.roundStatus === ROUND_PLAY_STATUS.SKIPPED,
  )
}

/**
 * Block score / question / round mutations during pause, stop, or complete.
 * @param {object} state
 * @returns {string | null}
 */
export function tournamentPlayBlockedReason(state) {
  if (state?.demoActive) return null
  const status = state?.tournament?.status
  if (status === TOURNAMENT_STATUS.PAUSED) {
    return 'Tournament is paused. Resume to continue play.'
  }
  if (status === TOURNAMENT_STATUS.STOPPED) {
    return 'Tournament is stopped. Resume the tournament to continue.'
  }
  if (status === TOURNAMENT_STATUS.COMPLETED) {
    return 'Tournament is completed. Scoring is locked.'
  }
  return null
}

export function canPauseTournament(state) {
  if (state?.demoActive) return false
  return state?.tournament?.status === TOURNAMENT_STATUS.IN_PROGRESS
}

export function canResumePausedTournament(state) {
  if (state?.demoActive) return false
  return state?.tournament?.status === TOURNAMENT_STATUS.PAUSED
}

export function canStopTournament(state) {
  if (state?.demoActive) return false
  const status = state?.tournament?.status
  return status === TOURNAMENT_STATUS.IN_PROGRESS || status === TOURNAMENT_STATUS.PAUSED
}

export function canResumeStoppedTournament(state) {
  if (state?.demoActive) return false
  return state?.tournament?.status === TOURNAMENT_STATUS.STOPPED
}

export function canCompleteTournament(state) {
  if (state?.demoActive) return false
  const status = state?.tournament?.status
  if (status === TOURNAMENT_STATUS.COMPLETED) return false
  if (!allPlannedRoundsSettled(state.tournament)) return false
  return (
    status === TOURNAMENT_STATUS.IN_PROGRESS ||
    status === TOURNAMENT_STATUS.PAUSED ||
    status === TOURNAMENT_STATUS.STOPPED
  )
}

export function isTournamentSessionVisible(state) {
  if (state?.demoActive) return false
  const status = state?.tournament?.status
  return ACTIVE_SESSION.has(status) || status === TOURNAMENT_STATUS.COMPLETED
}

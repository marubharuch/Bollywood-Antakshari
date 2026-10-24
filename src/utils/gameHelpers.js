import { TOURNAMENT_STATUS } from '../features/tournament/tournamentLifecycle.js'

/**
 * @param {{ id: string, score: number }[]} teams
 * @returns {Set<string>}
 */
export function getLeadingTeamIds(teams) {
  if (!teams?.length) return new Set()
  const max = Math.max(...teams.map((t) => t.score))
  return new Set(teams.filter((t) => t.score === max).map((t) => t.id))
}

export function eventStatusLabel(status) {
  const map = {
    idle: 'Idle',
    demo: 'Demo Live',
    live: 'Live',
    paused: 'Paused',
  }
  return map[status] ?? status
}

/**
 * Single host-console status for the top toolbar (not connection / sync).
 * @param {object} state
 * @returns {{ label: string, tone: string }}
 */
export function getHostConsoleStatus(state) {
  if (state?.demoActive) {
    return { label: 'Demo Running', tone: 'demo' }
  }
  const status = state?.tournament?.status
  if (status === TOURNAMENT_STATUS.PAUSED) {
    return { label: 'Paused', tone: 'paused' }
  }
  if (status === TOURNAMENT_STATUS.STOPPED) {
    return { label: 'Tournament Stopped', tone: 'paused' }
  }
  if (status === TOURNAMENT_STATUS.COMPLETED) {
    return { label: 'Tournament Complete', tone: 'idle' }
  }
  if (status === TOURNAMENT_STATUS.IN_PROGRESS) {
    return { label: 'Tournament Running', tone: 'live' }
  }
  return { label: 'Setup', tone: 'idle' }
}

export function isLiveTournamentSession(state) {
  return (
    state?.tournament?.status === TOURNAMENT_STATUS.IN_PROGRESS && !state?.demoActive
  )
}

export function eventStatusTone(status) {
  if (status === 'demo') return 'demo'
  if (status === 'live') return 'live'
  if (status === 'paused') return 'paused'
  return 'idle'
}

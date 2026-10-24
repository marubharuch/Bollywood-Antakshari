import { normalizeTournament } from './tournamentModel.js'

/**
 * @param {object} tournament
 * @param {string} planRoundId
 * @param {string} teamId
 * @param {number} delta
 */
export function applyTeamRoundScoreDelta(tournament, planRoundId, teamId, delta) {
  if (!planRoundId || !teamId || !delta) return tournament
  const t = normalizeTournament(tournament)
  const plannedRounds = t.plannedRounds.map((p) => {
    if (p.id !== planRoundId) return p
    const scores = { ...(p.teamRoundScores ?? {}) }
    scores[teamId] = (scores[teamId] ?? 0) + delta
    return { ...p, teamRoundScores: scores }
  })
  return normalizeTournament({ ...t, plannedRounds })
}

export function getTeamRoundScore(planned, teamId) {
  if (!planned?.teamRoundScores) return 0
  const v = planned.teamRoundScores[teamId]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/**
 * Replace a team's score for one planned round (used after Simple Antakshari is finalized).
 * @returns {{ tournament: object, delta: number }}
 */
export function setTeamRoundScore(tournament, planRoundId, teamId, absoluteScore) {
  if (!planRoundId || !teamId) {
    return { tournament: normalizeTournament(tournament), delta: 0 }
  }
  const next = Math.max(0, Math.round(Number(absoluteScore) || 0))
  const t = normalizeTournament(tournament)
  let delta = 0
  const plannedRounds = t.plannedRounds.map((p) => {
    if (p.id !== planRoundId) return p
    const scores = { ...(p.teamRoundScores ?? {}) }
    const old = typeof scores[teamId] === 'number' ? scores[teamId] : 0
    delta = next - old
    scores[teamId] = next
    return { ...p, teamRoundScores: scores }
  })
  return {
    tournament: normalizeTournament({ ...t, plannedRounds }),
    delta,
  }
}

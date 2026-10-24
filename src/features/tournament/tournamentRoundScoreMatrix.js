import { getTeamRoundScore } from './roundScoreLedger.js'

/**
 * Team × round score grid from per-round ledger (not stale team.score totals).
 * @param {object} tournament
 * @param {object[]} teams
 */
export function buildTournamentRoundScoreMatrix(tournament, teams = []) {
  const plannedRounds = tournament?.plannedRounds ?? []
  const columns = plannedRounds.map((p, index) => ({
    id: p.id,
    label: (p.snapshot?.name ?? `Round ${index + 1}`).trim() || `Round ${index + 1}`,
  }))
  const rows = (teams ?? []).map((team) => {
    const roundScores = plannedRounds.map((p) => getTeamRoundScore(p, team.id))
    const total = roundScores.reduce((sum, n) => sum + n, 0)
    return {
      teamId: team.id,
      teamName: team.name,
      accent: team.accent,
      roundScores,
      total,
    }
  })
  return { columns, rows }
}

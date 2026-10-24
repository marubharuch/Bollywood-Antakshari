/**
 * Quick sanity check for tournament standings matrix (run: node scripts/verify-standings-matrix.mjs).
 */
import assert from 'node:assert/strict'
import { buildTournamentRoundScoreMatrix } from '../src/features/tournament/tournamentRoundScoreMatrix.js'
import { ROUND_PLAY_STATUS } from '../src/features/tournament/tournamentModel.js'

const teams = [
  { id: 'a', name: 'Alpha', accent: '#f00', score: 15 },
  { id: 'b', name: 'Beta', accent: '#0f0', score: 5 },
]

const tournament = {
  plannedRounds: [
    {
      id: 'r1',
      roundStatus: ROUND_PLAY_STATUS.COMPLETED,
      snapshot: { name: 'Round A' },
      teamRoundScores: { a: 10, b: 0 },
    },
    {
      id: 'r2',
      roundStatus: ROUND_PLAY_STATUS.PENDING,
      snapshot: { name: 'Round B' },
      teamRoundScores: {},
    },
  ],
}

const { columns, rows } = buildTournamentRoundScoreMatrix(tournament, teams)
assert.equal(columns.length, 2)
assert.equal(columns[0].label, 'Round A')

const alpha = rows.find((r) => r.teamId === 'a')
const beta = rows.find((r) => r.teamId === 'b')
assert.deepEqual(alpha.roundScores, [10, 0])
assert.equal(alpha.total, 10)
assert.deepEqual(beta.roundScores, [0, 0])
assert.equal(beta.total, 0)

console.log('standings matrix checks passed')

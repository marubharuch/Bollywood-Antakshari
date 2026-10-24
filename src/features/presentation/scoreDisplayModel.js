export const SCORE_DISPLAY_MODE = {
  OFF: 'off',
  CONTEXT: 'context',
  TEAM: 'team',
  ROUND: 'round',
  ALL: 'all',
}

import { ROUND_PLAY_STATUS } from '../tournament/tournamentModel.js'

/** Round names for completed or in-progress rounds (not pending/skipped-only). */
export function getPlayedRoundNames(tournament) {
  const plans = tournament?.plannedRounds ?? []
  return plans
    .filter(
      (p) =>
        p.roundStatus === ROUND_PLAY_STATUS.COMPLETED ||
        p.roundStatus === ROUND_PLAY_STATUS.ACTIVE,
    )
    .map((p) => (p.snapshot?.name ?? '').trim() || 'Round')
}

export function normalizeScoreDisplay(raw) {
  const base = {
    projectorOn: false,
    mode: SCORE_DISPLAY_MODE.OFF,
  }
  if (!raw || typeof raw !== 'object') return base
  const mode = Object.values(SCORE_DISPLAY_MODE).includes(raw.mode) ? raw.mode : base.mode
  return {
    projectorOn: Boolean(raw.projectorOn),
    mode,
  }
}

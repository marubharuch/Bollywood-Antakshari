import { ROUND_PLAY_STATUS } from './tournamentModel.js'

export function findFirstPendingRoundIndex(plannedRounds) {
  return plannedRounds.findIndex((p) => p.roundStatus === ROUND_PLAY_STATUS.PENDING)
}

export function findNextSequentialPendingIndex(plannedRounds) {
  return findFirstPendingRoundIndex(plannedRounds)
}

/**
 * @returns {'play' | 'play_skipped' | 'disabled'}
 */
export function getRoundPlayAction(plan, index, plannedRounds) {
  if (plan.roundStatus === ROUND_PLAY_STATUS.COMPLETED) return 'disabled'
  if (plan.roundStatus === ROUND_PLAY_STATUS.ACTIVE) return 'play'
  if (plan.roundStatus === ROUND_PLAY_STATUS.SKIPPED) return 'play_skipped'
  if (plan.roundStatus === ROUND_PLAY_STATUS.PENDING) {
    const nextIdx = findNextSequentialPendingIndex(plannedRounds)
    if (nextIdx === index) return 'play'
    return 'disabled'
  }
  return 'disabled'
}

export function questionScoreRequired(round, question) {
  if (!question) return false
  if (round?.rules?.scoresOptional) return false
  const pts = round?.scoring?.correctPoints ?? 0
  const penalty = round?.scoring?.wrongPenalty ?? 0
  return pts > 0 || penalty > 0
}

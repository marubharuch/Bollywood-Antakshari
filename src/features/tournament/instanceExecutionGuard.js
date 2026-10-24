import { sumTeamScores } from './tournamentInstanceModel.js'
import { ROUND_PLAY_STATUS, QUESTION_STATUS } from './tournamentModel.js'
import { TOURNAMENT_STATUS } from './tournamentLifecycle.js'

/** Why a tournament instance was skipped during stage-plan → plannedRounds sync. */
export const STAGE_PLAN_SYNC_SKIP_REASON = {
  PROTECTED_EXECUTION_DATA: 'protected_execution_data',
  ACTIVE_SESSION: 'active_session',
  HAS_PLANNED_ROUNDS: 'has_planned_rounds',
}

const ACTIVE_SESSION_STATUSES = new Set([
  TOURNAMENT_STATUS.IN_PROGRESS,
  TOURNAMENT_STATUS.PAUSED,
  TOURNAMENT_STATUS.STOPPED,
  TOURNAMENT_STATUS.COMPLETED,
])

/**
 * True when this instance has teams/scores, round results, question progress, frozen
 * allocations, or bank pick configuration that must not be wiped by a shared stage replan.
 * @param {object | null | undefined} bundle tournament instance bundle
 */
export function instanceHasProtectedExecutionData(bundle) {
  if (!bundle) return false

  if (sumTeamScores(bundle.teams) > 0) return true

  const tournament = bundle.tournament
  if (!tournament) return false

  for (const plan of tournament.plannedRounds ?? []) {
    const status = plan.roundStatus ?? ROUND_PLAY_STATUS.PENDING
    if (
      status === ROUND_PLAY_STATUS.COMPLETED ||
      status === ROUND_PLAY_STATUS.SKIPPED ||
      status === ROUND_PLAY_STATUS.ACTIVE
    ) {
      return true
    }
    if (Object.keys(plan.teamRoundScores ?? {}).length > 0) return true
    if (plan.simpleScoresFinalized) return true
    if (plan.stoppedEarly) return true
    if ((plan.allocatedQuestionIds ?? []).length > 0) return true

    const progressQs = plan.questionProgress?.questions
    if (Array.isArray(progressQs)) {
      if (progressQs.some((q) => q?.status === QUESTION_STATUS.COMPLETED)) return true
      if (progressQs.some((q) => q?.status === QUESTION_STATUS.CURRENT)) return true
    }
  }

  const selections = bundle.questionBankSelections ?? {}
  for (const sel of Object.values(selections)) {
    if (!sel || typeof sel !== 'object') continue
    if (sel.pickMode === 'manual' && Array.isArray(sel.entryIds) && sel.entryIds.length > 0) {
      return true
    }
  }

  return false
}

/**
 * @param {object | null | undefined} bundle
 * @returns {STAGE_PLAN_SYNC_SKIP_REASON | null}
 */
export function stagePlanSyncSkipReason(bundle) {
  if (instanceHasProtectedExecutionData(bundle)) {
    return STAGE_PLAN_SYNC_SKIP_REASON.PROTECTED_EXECUTION_DATA
  }
  const status = bundle?.tournament?.status ?? TOURNAMENT_STATUS.DRAFT
  if (ACTIVE_SESSION_STATUSES.has(status)) {
    return STAGE_PLAN_SYNC_SKIP_REASON.ACTIVE_SESSION
  }
  return null
}

/**
 * Whether `syncTournamentInstancesFromStageProfiles` may rebuild plannedRounds for this bundle.
 * @param {object | null | undefined} bundle
 * @param {{ forceReplan?: boolean }} [options]
 */
export function shouldSyncPlannedRoundsFromStage(bundle, options = {}) {
  if (stagePlanSyncSkipReason(bundle)) return false

  const tournament = bundle?.tournament
  if (!tournament) return true

  const hasPlan = (tournament.plannedRounds ?? []).length > 0
  if (options.forceReplan) return true
  return !hasPlan
}

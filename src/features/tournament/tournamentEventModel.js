import { TOURNAMENT_STATUS } from './tournamentLifecycle.js'
import { ROUND_PLAY_STATUS } from './tournamentModel.js'
import {
  STAGE_PROFILE_ID,
  TOURNAMENT_INSTANCE_DEFS,
} from './tournamentRegistry.js'
import { sumTeamScores } from './tournamentInstanceModel.js'

export const QUARTER_FINAL_INSTANCE_DEFS = TOURNAMENT_INSTANCE_DEFS.filter(
  (d) => d.stageProfileId === STAGE_PROFILE_ID.QUARTER_FINAL,
)

export const DEFAULT_TOURNAMENT_EVENT_SETTINGS = {
  activeQuarterFinalCount: 4,
}

export function normalizeTournamentEventSettings(raw) {
  const base = { ...DEFAULT_TOURNAMENT_EVENT_SETTINGS }
  if (!raw || typeof raw !== 'object') return base
  let count = Number(raw.activeQuarterFinalCount)
  if (!Number.isFinite(count)) count = base.activeQuarterFinalCount
  count = Math.min(4, Math.max(0, Math.round(count)))
  return { activeQuarterFinalCount: count }
}

export function quarterFinalSlotIndex(instanceId) {
  const idx = QUARTER_FINAL_INSTANCE_DEFS.findIndex((d) => d.id === instanceId)
  return idx >= 0 ? idx : -1
}

export function isQuarterFinalInstance(instanceId) {
  return quarterFinalSlotIndex(instanceId) >= 0
}

/**
 * Whether this instance participates in the current event (playing workflow).
 * @param {string} instanceId
 * @param {object} eventSettings
 */
export function isInstanceActiveForEvent(instanceId, eventSettings) {
  const settings = normalizeTournamentEventSettings(eventSettings)
  const def = TOURNAMENT_INSTANCE_DEFS.find((d) => d.id === instanceId)
  if (!def) return false
  if (def.stageProfileId !== STAGE_PROFILE_ID.QUARTER_FINAL) return true
  const slot = quarterFinalSlotIndex(instanceId)
  return slot >= 0 && slot < settings.activeQuarterFinalCount
}

export function listInstancesActiveForEvent(eventSettings) {
  const settings = normalizeTournamentEventSettings(eventSettings)
  return TOURNAMENT_INSTANCE_DEFS.filter((d) => isInstanceActiveForEvent(d.id, settings))
}

export function listInactiveQuarterFinalInstances(eventSettings) {
  const settings = normalizeTournamentEventSettings(eventSettings)
  return QUARTER_FINAL_INSTANCE_DEFS.filter(
    (_, index) => index >= settings.activeQuarterFinalCount,
  )
}

export function countActiveTournamentsForEvent(eventSettings) {
  const settings = normalizeTournamentEventSettings(eventSettings)
  return settings.activeQuarterFinalCount + 2 + 1
}

/**
 * Saved progress/results — used when lowering active QF count.
 * @param {object | null | undefined} bundle
 */
export function instanceHasSavedProgress(bundle) {
  if (!bundle) return false
  const t = bundle.tournament
  const status = t?.status
  if (
    status === TOURNAMENT_STATUS.COMPLETED ||
    status === TOURNAMENT_STATUS.IN_PROGRESS ||
    status === TOURNAMENT_STATUS.PAUSED ||
    status === TOURNAMENT_STATUS.STOPPED ||
    status === TOURNAMENT_STATUS.READY
  ) {
    return true
  }
  if ((bundle.teams?.length ?? 0) >= 2) return true
  if (sumTeamScores(bundle.teams) > 0) return true
  for (const plan of t?.plannedRounds ?? []) {
    if (
      plan.roundStatus &&
      plan.roundStatus !== ROUND_PLAY_STATUS.PENDING &&
      plan.roundStatus !== ROUND_PLAY_STATUS.SKIPPED
    ) {
      return true
    }
    if (plan.roundStatus === ROUND_PLAY_STATUS.SKIPPED) return true
    if (Object.keys(plan.teamRoundScores ?? {}).length > 0) return true
    if (plan.simpleScoresFinalized) return true
    const qs = plan.questionProgress?.questions
    if (Array.isArray(qs) && qs.some((q) => q?.status === 'completed')) return true
  }
  return false
}

export function describeDeactivatedQuarterFinalsWithProgress(
  instances,
  newActiveCount,
) {
  const settings = normalizeTournamentEventSettings({ activeQuarterFinalCount: newActiveCount })
  return listInactiveQuarterFinalInstances(settings).filter((def) =>
    instanceHasSavedProgress(instances?.[def.id]),
  )
}

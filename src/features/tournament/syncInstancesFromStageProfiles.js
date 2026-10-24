import {
  buildPlannedRoundsFromStageProfile,
  validateStageProfile,
} from './stageProfileModel.js'
import { allocateQuestionsForInstance } from './questionAllocation.js'
import {
  createEmptyTournamentInstanceBundle,
  normalizeTournamentInstanceBundle,
} from './tournamentInstanceModel.js'
import { normalizeTournament } from './tournamentModel.js'
import { TOURNAMENT_STATUS } from './tournamentLifecycle.js'
import { getTournamentInstanceDef, TOURNAMENT_INSTANCE_DEFS } from './tournamentRegistry.js'
import { shouldSyncPlannedRoundsFromStage } from './instanceExecutionGuard.js'

export { shouldSyncPlannedRoundsFromStage } from './instanceExecutionGuard.js'

const ACTIVE_SESSION_STATUSES = new Set([
  TOURNAMENT_STATUS.IN_PROGRESS,
  TOURNAMENT_STATUS.PAUSED,
  TOURNAMENT_STATUS.STOPPED,
  TOURNAMENT_STATUS.COMPLETED,
])

/**
 * Build planned rounds on a tournament instance bundle from its shared stage profile.
 * Does not change teams, scores, buzzer, or in-progress session data.
 */
export function prepareTournamentBundleFromStageProfile({
  instanceId,
  bundle,
  stageProfiles,
  roundLibrary,
  tournamentInstances,
  tournamentEventSettings,
  allowQuestionReuse = false,
  questionLibrary = [],
}) {
  const def = getTournamentInstanceDef(instanceId)
  if (!def) return { success: false, errors: ['Unknown tournament instance.'] }

  const profile = stageProfiles?.[def.stageProfileId]
  const profileCheck = validateStageProfile(profile, roundLibrary)
  if (!profileCheck.valid) {
    return { success: false, errors: profileCheck.errors }
  }

  const baseBundle = normalizeTournamentInstanceBundle({
    ...(bundle ?? createEmptyTournamentInstanceBundle(instanceId)),
    instanceId,
  })

  const tournament = normalizeTournament({
    ...baseBundle.tournament,
    id: instanceId,
    name: def.name,
  })

  const alloc = allocateQuestionsForInstance(
    profile,
    roundLibrary,
    tournamentInstances,
    instanceId,
    {
      allowReuse: allowQuestionReuse,
      shuffle: Boolean(profile.playSettings?.questionOrderShuffle),
    },
    tournamentEventSettings,
    questionLibrary,
  )

  const allocations = alloc.success ? alloc.allocations : {}
  const plannedRounds = buildPlannedRoundsFromStageProfile(
    profile,
    roundLibrary,
    allocations,
  )

  const teams = baseBundle.teams ?? []
  let nextStatus = tournament.status ?? TOURNAMENT_STATUS.DRAFT
  if (!ACTIVE_SESSION_STATUSES.has(nextStatus)) {
    nextStatus = teams.length >= 2 ? TOURNAMENT_STATUS.READY : TOURNAMENT_STATUS.DRAFT
  }

  const nextTournament = normalizeTournament({
    ...tournament,
    plannedRounds,
    playSettings: profile.playSettings ?? tournament.playSettings,
    status: nextStatus,
    configuredAt: Date.now(),
  })

  return {
    success: true,
    bundle: normalizeTournamentInstanceBundle({
      ...baseBundle,
      instanceId,
      tournament: nextTournament,
    }),
    allocationWarnings: alloc.success ? [] : alloc.errors ?? [],
  }
}

/**
 * Apply stage profiles to tournament instance bundles (shared SF plan → SF1 & SF2, etc.).
 * @param {object} ctx
 * @param {Record<string, object>} ctx.tournamentInstances
 * @param {object} ctx.stageProfiles
 * @param {object[]} ctx.roundLibrary
 * @param {object} [ctx.tournamentEventSettings]
 * @param {string} [ctx.stageProfileId] when set, only instances using this profile
 * @param {boolean} [ctx.forceReplan]
 */
export function syncTournamentInstancesFromStageProfiles(ctx) {
  const {
    tournamentInstances = {},
    stageProfiles,
    roundLibrary,
    tournamentEventSettings,
    stageProfileId = null,
    forceReplan = false,
    questionLibrary = [],
  } = ctx

  const instances = { ...tournamentInstances }
  let changed = false
  const warnings = []

  for (const def of TOURNAMENT_INSTANCE_DEFS) {
    if (stageProfileId && def.stageProfileId !== stageProfileId) continue

    const bundle = instances[def.id] ?? createEmptyTournamentInstanceBundle(def.id)
    if (!shouldSyncPlannedRoundsFromStage(bundle, { forceReplan })) continue

    const result = prepareTournamentBundleFromStageProfile({
      instanceId: def.id,
      bundle,
      stageProfiles,
      roundLibrary,
      tournamentInstances: instances,
      tournamentEventSettings,
      questionLibrary,
    })

    if (!result.success) continue

    if (result.allocationWarnings?.length) {
      warnings.push({ instanceId: def.id, errors: result.allocationWarnings })
    }

    instances[def.id] = result.bundle
    changed = true
  }

  return { tournamentInstances: instances, changed, warnings }
}

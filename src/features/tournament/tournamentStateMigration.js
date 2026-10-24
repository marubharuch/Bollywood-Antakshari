import {
  matchLegacyTournamentToInstanceId,
  STAGE_PROFILE_ID,
  TOURNAMENT_INSTANCE_DEFS,
} from './tournamentRegistry.js'
import {
  createDefaultTournamentInstancesMap,
  normalizeTournamentInstanceBundle,
} from './tournamentInstanceModel.js'
import { normalizeStageProfiles, slotsFromLegacyPlannedRounds } from './stageProfileModel.js'
import { normalizeTournament, normalizeTournamentPlans } from './tournamentModel.js'
import { syncTournamentInstancesFromStageProfiles } from './syncInstancesFromStageProfiles.js'

function bundleFromLegacySlice(tournament, teams, extras = {}) {
  const instanceId =
    matchLegacyTournamentToInstanceId(tournament) ?? TOURNAMENT_INSTANCE_DEFS[0].id
  return normalizeTournamentInstanceBundle({
    instanceId,
    tournament: normalizeTournament({ ...tournament, id: instanceId }),
    teams,
    ...extras,
  })
}

/**
 * Upgrade persisted state to multi-tournament layout without discarding data.
 * @param {object} normalized output of partial normalizeGameState before migration
 */
export function migrateGameStateToMultiTournament(normalized) {
  const hasInstances =
    normalized.tournamentInstances &&
    TOURNAMENT_INSTANCE_DEFS.every((d) => normalized.tournamentInstances[d.id])

  let tournamentInstances = hasInstances
    ? normalized.tournamentInstances
    : createDefaultTournamentInstancesMap()

  let stageProfiles = normalizeStageProfiles(normalized.stageProfiles)
  let activeTournamentInstanceId =
    normalized.activeTournamentInstanceId ??
    matchLegacyTournamentToInstanceId(normalized.tournament) ??
    TOURNAMENT_INSTANCE_DEFS[0].id

  if (!hasInstances) {
    const plans = normalizeTournamentPlans(normalized.tournamentPlans)
    const roundLibrary = normalized.roundLibrary ?? []

    if (plans.length) {
      for (const plan of plans) {
        const id = matchLegacyTournamentToInstanceId(plan) ?? plan.id
        const matchDef = TOURNAMENT_INSTANCE_DEFS.find((d) => d.id === id)
        if (matchDef) {
          tournamentInstances[matchDef.id] = bundleFromLegacySlice(plan, normalized.teams, {
            playSession: normalized.playSession,
            playTimer: normalized.playTimer,
            presentation: normalized.presentation,
            scoreDisplay: normalized.scoreDisplay,
            buzzer: normalized.buzzer,
            eventStatus: normalized.eventStatus,
            stage: plan.name,
            question: normalized.question,
          })
        }
      }
    }

    const legacyId = matchLegacyTournamentToInstanceId(normalized.tournament)
    const targetId = legacyId ?? activeTournamentInstanceId
    if (normalized.tournament?.plannedRounds?.length || normalized.teams?.length) {
      tournamentInstances[targetId] = bundleFromLegacySlice(
        normalized.tournament,
        normalized.teams,
        {
          playSession: normalized.playSession,
          playTimer: normalized.playTimer,
          presentation: normalized.presentation,
          scoreDisplay: normalized.scoreDisplay,
          buzzer: normalized.buzzer,
          eventStatus: normalized.eventStatus,
          stage: normalized.stage ?? normalized.tournament?.name,
          question: normalized.question,
        },
      )
      activeTournamentInstanceId = targetId
    }

    const qf1 = tournamentInstances[TOURNAMENT_INSTANCE_DEFS[0].id]
    if (!stageProfiles.quarter_final.slots.length && qf1?.tournament?.plannedRounds?.length) {
      stageProfiles = {
        ...stageProfiles,
        quarter_final: {
          ...stageProfiles.quarter_final,
          slots: slotsFromLegacyPlannedRounds(qf1.tournament.plannedRounds, roundLibrary),
          savedAt: Date.now(),
        },
      }
    }

    const legacyName = (normalized.tournament?.name ?? '').toLowerCase()
    if (legacyName.includes('semi') && !stageProfiles.semi_final.slots.length) {
      const semi = TOURNAMENT_INSTANCE_DEFS.find((d) => d.id === 'ti-semi-final-1')
      const semiBundle = tournamentInstances[semi?.id ?? '']
      if (semiBundle?.tournament?.plannedRounds?.length) {
        stageProfiles.semi_final = {
          ...stageProfiles.semi_final,
          slots: slotsFromLegacyPlannedRounds(
            semiBundle.tournament.plannedRounds,
            roundLibrary,
          ),
          savedAt: Date.now(),
        }
      }
    }
    if (legacyName.includes('final') && !stageProfiles.grand_finale.slots.length) {
      const gf = tournamentInstances['ti-grand-finale']
      if (gf?.tournament?.plannedRounds?.length) {
        stageProfiles.grand_finale = {
          ...stageProfiles.grand_finale,
          slots: slotsFromLegacyPlannedRounds(gf.tournament.plannedRounds, roundLibrary),
          savedAt: Date.now(),
        }
      }
    }
  }

  const synced = syncTournamentInstancesFromStageProfiles({
    tournamentInstances,
    stageProfiles,
    roundLibrary: normalized.roundLibrary ?? [],
    tournamentEventSettings: normalized.tournamentEventSettings,
  })
  tournamentInstances = synced.tournamentInstances

  const activeBundle = tournamentInstances[activeTournamentInstanceId]
  const tournamentPlans = TOURNAMENT_INSTANCE_DEFS.map((d) =>
    normalizeTournament(tournamentInstances[d.id]?.tournament),
  )

  return {
    ...normalized,
    tournamentInstances,
    stageProfiles,
    activeTournamentInstanceId,
    tournamentPlans,
    tournament: activeBundle?.tournament ?? normalized.tournament,
    teams: activeBundle?.teams ?? normalized.teams,
    playSession: activeBundle?.playSession ?? normalized.playSession,
    playTimer: activeBundle?.playTimer ?? normalized.playTimer,
    presentation: activeBundle?.presentation ?? normalized.presentation,
    scoreDisplay: activeBundle?.scoreDisplay ?? normalized.scoreDisplay,
    buzzer: activeBundle?.buzzer ?? normalized.buzzer,
    eventStatus: activeBundle?.eventStatus ?? normalized.eventStatus,
    stage: activeBundle?.stage ?? normalized.stage,
  }
}

export function getStageProfileIdForInstance(instanceId) {
  const def = TOURNAMENT_INSTANCE_DEFS.find((d) => d.id === instanceId)
  return def?.stageProfileId ?? STAGE_PROFILE_ID.QUARTER_FINAL
}

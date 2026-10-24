import { normalizeBuzzerSystem } from '../buzzer/buzzerModel.js'
import { normalizePresentation } from '../presentation/introModel.js'
import { normalizeScoreDisplay } from '../presentation/scoreDisplayModel.js'
import { normalizeMediaItem, normalizeMediaLibrary } from '../media/mediaModel.js'
import { normalizeRound } from '../rounds/roundModel.js'
import { normalizeTeam, normalizeTeamsList } from '../tournament/teamModel.js'
import {
  ANCHOR_STEPS,
  createTournamentId,
  normalizePlaySession,
  normalizePlannedRound,
  normalizeTournament,
  normalizeTournamentPlans,
  ROUND_PLAY_STATUS,
  upsertTournamentPlan,
} from '../tournament/tournamentModel.js'
import {
  TOURNAMENT_EXPORT_FORMAT,
  TOURNAMENT_EXPORT_VERSION,
} from './tournamentExportModel.js'
import {
  loadMigrationRegistry,
  recordMigrationImport,
} from './migrationRegistry.js'
import { normalizeStageProfiles } from '../tournament/stageProfileModel.js'
import {
  applyTournamentInstanceBundle,
  normalizeTournamentInstances,
} from '../tournament/tournamentInstanceModel.js'
import { TOURNAMENT_INSTANCE_DEFS } from '../tournament/tournamentRegistry.js'
import { normalizeTournamentEventSettings } from '../tournament/tournamentEventModel.js'
import { migrateGameStateToMultiTournament } from '../tournament/tournamentStateMigration.js'

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * @param {unknown} raw
 */
export function validateTournamentImportPackage(raw) {
  const errors = []
  if (!isObject(raw)) {
    return { valid: false, errors: ['File is not a valid JSON object.'], data: null }
  }
  if (raw.format !== TOURNAMENT_EXPORT_FORMAT) {
    errors.push(`Unknown export format (expected ${TOURNAMENT_EXPORT_FORMAT}).`)
  }
  const formatVersion = raw.formatVersion
  if (formatVersion !== 1 && formatVersion !== TOURNAMENT_EXPORT_VERSION) {
    errors.push(
      `Unsupported format version ${String(formatVersion)} (expected 1 or ${TOURNAMENT_EXPORT_VERSION}).`,
    )
  }
  if (typeof raw.packageId !== 'string' || !raw.packageId.trim()) {
    errors.push('Missing packageId.')
  }
  if (!isObject(raw.tournament)) {
    errors.push('Missing tournament configuration.')
  }
  if (!Array.isArray(raw.roundLibrary)) {
    errors.push('Missing roundLibrary array.')
  }
  const isMulti = formatVersion === TOURNAMENT_EXPORT_VERSION && isObject(raw.tournamentInstances)
  if (!isMulti && !Array.isArray(raw.teams)) {
    errors.push('Missing teams array.')
  }
  if (isMulti && !isObject(raw.stageProfiles)) {
    errors.push('Missing stageProfiles (multi-tournament export).')
  }
  if (!Array.isArray(raw.mediaCatalog)) {
    errors.push('Missing mediaCatalog array.')
  }

  if (errors.length) {
    return { valid: false, errors, data: null }
  }

  const tournament = normalizeTournament({
    ...raw.tournament,
    status: raw.tournament?.status === 'completed' ? 'completed' : raw.tournament?.status,
    startedAt: raw.tournament?.startedAt ?? null,
  })
  const roundLibrary = raw.roundLibrary.map((r) => normalizeRound(r)).filter(Boolean)
  const teams = normalizeTeamsList(raw.teams ?? [], []).map((t, i) => normalizeTeam(t, i))
  const stageProfiles = isMulti ? normalizeStageProfiles(raw.stageProfiles) : null
  const tournamentInstances = isMulti
    ? normalizeTournamentInstances(raw.tournamentInstances)
    : null
  const activeTournamentInstanceId =
    typeof raw.activeTournamentInstanceId === 'string'
      ? raw.activeTournamentInstanceId
      : TOURNAMENT_INSTANCE_DEFS[0].id
  const tournamentEventSettings = normalizeTournamentEventSettings(raw.tournamentEventSettings)
  const mediaCatalog = raw.mediaCatalog
    .map((m) => normalizeMediaItem({ ...m, offlineReady: false }))
    .filter(Boolean)
  const buzzerSystem = normalizeBuzzerSystem(raw.buzzerSystem)
  const presentation = normalizePresentation(raw.presentation)
  const scoreDisplay = normalizeScoreDisplay(raw.scoreDisplay)

  return {
    valid: true,
    errors: [],
    data: {
      packageId: raw.packageId.trim(),
      contentSignature:
        typeof raw.contentSignature === 'string' ? raw.contentSignature : null,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
      tournament,
      roundLibrary,
      teams,
      mediaCatalog,
      buzzerSystem,
      presentation,
      scoreDisplay,
      stageProfiles,
      tournamentInstances,
      activeTournamentInstanceId,
      tournamentEventSettings,
      isMulti,
    },
  }
}

function mergeRoundLibrary(existing, imported, { replace }) {
  const importIds = new Set(imported.map((r) => r.id))
  let next = [...existing]
  if (replace) {
    next = next.filter((r) => !importIds.has(r.id))
  }
  for (const round of imported) {
    const idx = next.findIndex((r) => r.id === round.id)
    if (idx >= 0) {
      next[idx] = round
    } else {
      next.push(round)
    }
  }
  return next
}

function mergeMediaCatalog(existing, catalog, idbReadyIds) {
  const byId = new Map((existing ?? []).map((m) => [m.id, m]))
  for (const entry of catalog) {
    const prev = byId.get(entry.id)
    const offlineReady =
      Boolean(idbReadyIds?.has(entry.id)) ||
      Boolean(prev?.offlineReady && prev.source === 'external') ||
      (entry.source === 'external' && entry.externalUrl)
    byId.set(
      entry.id,
      normalizeMediaItem({
        ...(prev ?? {}),
        ...entry,
        id: entry.id,
        offlineReady,
      }),
    )
  }
  return normalizeMediaLibrary([...byId.values()])
}

function regeneratePlannedRoundIds(plannedRounds) {
  return (plannedRounds ?? []).map((plan) =>
    normalizePlannedRound({
      ...plan,
      id: `plan-${plan.libraryRoundId ?? plan.snapshot?.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roundStatus: ROUND_PLAY_STATUS.PENDING,
      questionProgress: {},
      teamRoundScores: {},
      simpleScoresFinalized: false,
      stoppedEarly: false,
    }),
  )
}

/**
 * @param {object} state
 * @param {object} pkg
 * @param {{ mode: 'new' | 'replace', forceDuplicate?: boolean, idbReadyIds?: Set<string> }} options
 */
export function applyTournamentImportPackage(state, pkg, options = {}) {
  const validation = validateTournamentImportPackage(pkg)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const { data } = validation
  const registry = loadMigrationRegistry()
  const duplicateByPackage = registry.imports.some((r) => r.packageId === data.packageId)
  const duplicateBySignature =
    data.contentSignature &&
    registry.imports.some((r) => r.contentSignature === data.contentSignature)

  if ((duplicateByPackage || duplicateBySignature) && !options.forceDuplicate) {
    return {
      success: false,
      duplicate: true,
      errors: [
        'This export was already imported on this browser. Use “Import as new copy” or confirm duplicate import.',
      ],
    }
  }

  const mode = options.mode === 'replace' ? 'replace' : 'new'

  if (data.isMulti && data.tournamentInstances && data.stageProfiles) {
    const roundLibrary = mergeRoundLibrary(state.roundLibrary ?? [], data.roundLibrary, {
      replace: mode === 'replace',
    })
    const mediaLibrary = mergeMediaCatalog(
      state.mediaLibrary,
      data.mediaCatalog,
      options.idbReadyIds,
    )
    const tournamentInstances =
      mode === 'replace'
        ? data.tournamentInstances
        : { ...(state.tournamentInstances ?? {}), ...data.tournamentInstances }
    const stageProfiles =
      mode === 'replace'
        ? data.stageProfiles
        : { ...(state.stageProfiles ?? {}), ...data.stageProfiles }
    const activeId =
      data.activeTournamentInstanceId ?? state.activeTournamentInstanceId
    const bundle = tournamentInstances[activeId]
    const activeSlice = bundle
      ? applyTournamentInstanceBundle(bundle, state)
      : { tournament: normalizeTournament(data.tournament), teams: data.teams }

    recordMigrationImport({
      packageId: data.packageId,
      contentSignature: data.contentSignature,
      tournamentId: activeId,
      importedAt: Date.now(),
      mode,
    })

    const merged = migrateGameStateToMultiTournament({
      ...state,
      ...activeSlice,
      stageProfiles,
      tournamentInstances,
      activeTournamentInstanceId: activeId,
      tournamentEventSettings: data.tournamentEventSettings,
      roundLibrary,
      mediaLibrary,
      buzzerSystem: data.buzzerSystem,
      playSession: normalizePlaySession({
        anchorStep: ANCHOR_STEPS.TOURNAMENT_SELECT,
        entryResolved: false,
      }),
      eventStatus: 'idle',
    })

    return {
      success: true,
      patch: {
        ...merged,
        simulationMode: false,
        demoActive: false,
      },
    }
  }

  let tournament = normalizeTournament(data.tournament)

  if (mode === 'new') {
    const suffix = duplicateByPackage || duplicateBySignature ? ' (copy)' : ''
    tournament = normalizeTournament({
      ...tournament,
      id: createTournamentId(),
      name: `${tournament.name}${suffix}`.trim(),
      plannedRounds: regeneratePlannedRoundIds(tournament.plannedRounds),
    })
  } else {
    tournament = normalizeTournament({
      ...tournament,
      plannedRounds: regeneratePlannedRoundIds(tournament.plannedRounds),
    })
  }

  const roundLibrary = mergeRoundLibrary(state.roundLibrary ?? [], data.roundLibrary, {
    replace: mode === 'replace',
  })
  const mediaLibrary = mergeMediaCatalog(
    state.mediaLibrary,
    data.mediaCatalog,
    options.idbReadyIds,
  )

  let tournamentPlans = normalizeTournamentPlans(state.tournamentPlans)
  if (mode === 'replace') {
    tournamentPlans = tournamentPlans.filter((p) => p.id !== data.tournament.id)
  }
  tournamentPlans = upsertTournamentPlan(tournamentPlans, tournament)

  const playSession = normalizePlaySession({
    anchorStep: ANCHOR_STEPS.TOURNAMENT_SELECT,
    entryResolved: false,
  })

  recordMigrationImport({
    packageId: data.packageId,
    contentSignature: data.contentSignature,
    tournamentId: tournament.id,
    importedAt: Date.now(),
    mode,
  })

  return {
    success: true,
    patch: {
      tournament,
      tournamentPlans,
      roundLibrary,
      teams: data.teams,
      mediaLibrary,
      buzzerSystem: data.buzzerSystem,
      presentation: data.presentation,
      scoreDisplay: data.scoreDisplay,
      playSession,
      eventStatus: 'idle',
      simulationMode: false,
      demoActive: false,
    },
  }
}

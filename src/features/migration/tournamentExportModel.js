import { normalizeBuzzerSystem } from '../buzzer/buzzerModel.js'
import { normalizePresentation } from '../presentation/introModel.js'
import { normalizeScoreDisplay } from '../presentation/scoreDisplayModel.js'
import { normalizeMediaItem } from '../media/mediaModel.js'
import { normalizeRound } from '../rounds/roundModel.js'
import {
  createPlannedRound,
  normalizePlannedRound,
  normalizeTournament,
  ROUND_PLAY_STATUS,
  snapshotRound,
} from '../tournament/tournamentModel.js'
import { normalizeStageProfiles } from '../tournament/stageProfileModel.js'
import { normalizeTournamentInstances } from '../tournament/tournamentInstanceModel.js'
import { TOURNAMENT_INSTANCE_DEFS } from '../tournament/tournamentRegistry.js'
import { normalizeTournamentEventSettings } from '../tournament/tournamentEventModel.js'

export const TOURNAMENT_EXPORT_FORMAT = 'bollywood-antakshari-tournament'
export const TOURNAMENT_EXPORT_VERSION = 2

function createPackageId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * @param {object[]} rounds
 */
export function collectMediaIdsFromRounds(rounds) {
  const ids = new Set()
  for (const round of rounds ?? []) {
    for (const q of round?.questions ?? []) {
      if (typeof q?.mediaId === 'string' && q.mediaId.trim()) {
        ids.add(q.mediaId.trim())
      }
    }
  }
  return ids
}

function exportMediaCatalog(mediaLibrary, referencedIds) {
  const list = mediaLibrary ?? []
  return list
    .filter((m) => referencedIds.has(m.id))
    .map((m) => {
      const item = normalizeMediaItem(m)
      if (!item) return null
      return {
        id: item.id,
        displayTitle: item.displayTitle,
        originalFileName: item.originalFileName,
        mimeType: item.mimeType,
        mediaType: item.mediaType,
        sizeBytes: item.sizeBytes,
        category: item.category,
        assignedRoundId: item.assignedRoundId,
        source: item.source,
        externalUrl: item.externalUrl,
      }
    })
    .filter(Boolean)
}

function freshPlannedRoundFromLibrary(libraryRound, existingPlan) {
  const created = createPlannedRound(libraryRound)
  if (!created) return null
  return normalizePlannedRound({
    ...created,
    id: existingPlan?.id ?? created.id,
    libraryRoundId: libraryRound.id,
    snapshot: snapshotRound(libraryRound),
    roundStatus: ROUND_PLAY_STATUS.PENDING,
    questionProgress: {},
    teamRoundScores: {},
    simpleScoresFinalized: false,
    stoppedEarly: false,
  })
}

function sanitizeTournamentForExport(tournament, roundById) {
  const base = normalizeTournament(tournament)
  const plannedRounds = (base.plannedRounds ?? [])
    .map((plan) => {
      const libId = plan.libraryRoundId ?? plan.snapshot?.id
      const libraryRound = libId ? roundById.get(libId) : null
      if (!libraryRound) {
        return normalizePlannedRound({
          ...plan,
          roundStatus: ROUND_PLAY_STATUS.PENDING,
          questionProgress: {},
          teamRoundScores: {},
          simpleScoresFinalized: false,
          stoppedEarly: false,
        })
      }
      return freshPlannedRoundFromLibrary(libraryRound, plan)
    })
    .filter(Boolean)

  return normalizeTournament({
    ...base,
    status: 'draft',
    plannedRounds,
    currentRoundIndex: 0,
    configuredAt: base.configuredAt ?? Date.now(),
    startedAt: null,
  })
}

/**
 * Build a portable JSON package from current game state (no media blobs).
 * @param {object} state
 */
function collectLibraryRoundIdsFromState(state) {
  const libraryRoundIds = new Set()
  for (const def of TOURNAMENT_INSTANCE_DEFS) {
    const t = state.tournamentInstances?.[def.id]?.tournament ?? state.tournament
    for (const plan of t?.plannedRounds ?? []) {
      const id = plan.libraryRoundId ?? plan.snapshot?.id
      if (id) libraryRoundIds.add(id)
    }
  }
  for (const profile of Object.values(state.stageProfiles ?? {})) {
    for (const slot of profile?.slots ?? []) {
      if (slot.libraryRoundId) libraryRoundIds.add(slot.libraryRoundId)
    }
  }
  return libraryRoundIds
}

export function buildTournamentExportPackage(state) {
  const tournament = normalizeTournament(state.tournament)
  const libraryRoundIds = collectLibraryRoundIdsFromState(state)

  const roundLibrary = (state.roundLibrary ?? [])
    .filter((r) => libraryRoundIds.has(r.id))
    .map((r) => JSON.parse(JSON.stringify(normalizeRound(r))))

  const roundById = new Map(roundLibrary.map((r) => [r.id, r]))
  const exportedTournament = sanitizeTournamentForExport(tournament, roundById)
  const allMediaIds = collectMediaIdsFromRounds(roundLibrary)
  const packageId = createPackageId()
  const contentSignature = `multi|${TOURNAMENT_INSTANCE_DEFS.map((d) => d.id).join(',')}`

  const instances = normalizeTournamentInstances(state.tournamentInstances)
  const exportedInstances = {}
  for (const def of TOURNAMENT_INSTANCE_DEFS) {
    const bundle = instances[def.id]
    const t = sanitizeTournamentForExport(bundle.tournament, roundById)
    exportedInstances[def.id] = {
      ...bundle,
      tournament: t,
      teams: bundle.teams,
    }
  }

  return {
    format: TOURNAMENT_EXPORT_FORMAT,
    formatVersion: TOURNAMENT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    packageId,
    contentSignature,
    activeTournamentInstanceId: state.activeTournamentInstanceId,
    tournamentEventSettings: normalizeTournamentEventSettings(state.tournamentEventSettings),
    stageProfiles: normalizeStageProfiles(state.stageProfiles),
    tournamentInstances: exportedInstances,
    tournament: exportedTournament,
    roundLibrary,
    teams: state.teams,
    buzzerSystem: normalizeBuzzerSystem(state.buzzerSystem),
    presentation: sanitizePresentationForExport(state.presentation),
    scoreDisplay: normalizeScoreDisplay(state.scoreDisplay),
    mediaCatalog: exportMediaCatalog(state.mediaLibrary, allMediaIds),
  }
}

function sanitizePresentationForExport(presentation) {
  const p = normalizePresentation(presentation)
  return normalizePresentation({
    ...p,
    grandOpeningPlayedForTournamentId: null,
    pendingRoundIntroPlanId: null,
    intro: { kind: 'none', status: 'idle', token: null, stageLine: '', roundName: '' },
  })
}

export function downloadTournamentExportPackage(pkg) {
  const tournamentName =
    typeof pkg?.tournament?.name === 'string' && pkg.tournament.name.trim()
      ? pkg.tournament.name.trim().replace(/[^\w\s-]+/g, '').trim()
      : 'tournament'
  const date = new Date().toISOString().slice(0, 10)
  const filename = `bollywood-antakshari-${tournamentName}-${date}.json`
  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

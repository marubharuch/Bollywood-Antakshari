import {
  normalizeMediaLibrary,
  normalizeMediaPlayback,
} from '../features/media/mediaModel.js'
import {
  EXAMPLE_ROUND_TEMPLATES,
  normalizeRoundLibrary,
} from '../features/rounds/roundModel.js'
import { applyHindiWordLibraryToRoundLibrary } from '../features/rounds/hindiWordLibraryInstall.js'
import { applyQuestionBankRoundsToRoundLibrary } from '../features/questionBank/questionBankRoundInstall.js'
import {
  normalizeBuzzer,
  normalizeBuzzerSystem,
} from '../features/buzzer/buzzerModel.js'
import {
  normalizePlaySession,
  normalizePlayTimer,
  normalizeTournament,
  normalizeTournamentPlans,
  upsertTournamentPlan,
} from '../features/tournament/tournamentModel.js'
import { normalizePresentation } from '../features/presentation/introModel.js'
import { normalizeScoreDisplay } from '../features/presentation/scoreDisplayModel.js'
import {
  isScoreAnnouncementActive,
  normalizeScoreAnnouncement,
} from '../features/presentation/scoreAnnouncementModel.js'
import { normalizeScorePresentation } from '../features/presentation/scorePresentationModel.js'
import { normalizeTeam, normalizeTeamsList } from '../features/tournament/teamModel.js'
import { normalizeStageProfiles } from '../features/tournament/stageProfileModel.js'
import {
  createDefaultTournamentInstancesMap,
  normalizeTournamentInstances,
} from '../features/tournament/tournamentInstanceModel.js'
import { migrateGameStateToMultiTournament } from '../features/tournament/tournamentStateMigration.js'
import { TOURNAMENT_INSTANCE_DEFS } from '../features/tournament/tournamentRegistry.js'
import { normalizeTournamentEventSettings } from '../features/tournament/tournamentEventModel.js'

/** @typedef {'idle' | 'demo' | 'live' | 'paused'} EventStatus */
/** @typedef {'idle' | 'ready' | 'active' | 'locked'} BuzzerStatus */

const SAMPLE_TEAMS = [
  { id: 'team-1', name: 'Team Rang De', score: 120, accent: '#e11d48' },
  { id: 'team-2', name: 'Team Dil Se', score: 95, accent: '#7c3aed' },
  { id: 'team-3', name: 'Team Taal', score: 110, accent: '#0891b2' },
  { id: 'team-4', name: 'Team Josh', score: 80, accent: '#ea580c' },
]

export function createInitialGameState(overrides = {}) {
  return {
    eventStatus: 'idle',
    simulationMode: false,
    demoActive: false,
    stage: 'Quarter Final',
    round: 1,
    roundLabel: 'Round 1 — Antakshari Chain',
    question: {
      prompt: 'Name a Bollywood song that begins with the letter…',
      letter: 'M',
      hiddenAnswer: 'Mere Sapno Ki Rani — Aradhana (1969)',
      answerRevealed: false,
    },
    buzzer: normalizeBuzzer(null),
    buzzerSystem: normalizeBuzzerSystem(null),
    tournament: normalizeTournament(null),
    activeTournamentInstanceId: TOURNAMENT_INSTANCE_DEFS[0].id,
    stageProfiles: normalizeStageProfiles(null),
    tournamentInstances: createDefaultTournamentInstancesMap(),
    tournamentEventSettings: normalizeTournamentEventSettings(null),
    tournamentPlans: [],
    playSession: normalizePlaySession(null),
    playTimer: normalizePlayTimer(null),
    presentation: normalizePresentation(null),
    scoreDisplay: normalizeScoreDisplay(null),
    scoreAnnouncement: null,
    scorePresentation: normalizeScorePresentation(null),
    teams: SAMPLE_TEAMS.map((team, index) => normalizeTeam(team, index)),
    roundLibrary: normalizeRoundLibrary(null, EXAMPLE_ROUND_TEMPLATES),
    selectedRoundId: null,
    mediaLibrary: [],
    mediaPlayback: normalizeMediaPlayback(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

export const INITIAL_GAME_STATE = createInitialGameState()

/**
 * Merge persisted or partial sync payloads with defaults so nested slices never go missing.
 * @param {object | null | undefined} raw
 */
export function normalizeGameState(raw) {
  const base = createInitialGameState()
  if (!raw || typeof raw !== 'object') {
    return base
  }

  const hasRoundLibrary = Object.prototype.hasOwnProperty.call(raw, 'roundLibrary')
  const roundLibraryBase = hasRoundLibrary
    ? normalizeRoundLibrary(raw.roundLibrary, [])
    : normalizeRoundLibrary(null, EXAMPLE_ROUND_TEMPLATES)
  let roundLibrary = applyHindiWordLibraryToRoundLibrary(roundLibraryBase).roundLibrary
  roundLibrary = applyQuestionBankRoundsToRoundLibrary(roundLibrary).roundLibrary

  let selectedRoundId =
    typeof raw.selectedRoundId === 'string' ? raw.selectedRoundId : null
  if (selectedRoundId && !roundLibrary.some((r) => r.id === selectedRoundId)) {
    selectedRoundId = null
  }

  const merged = {
    ...base,
    ...raw,
    question: { ...base.question, ...(raw.question ?? {}) },
    buzzer: normalizeBuzzer({ ...base.buzzer, ...(raw.buzzer ?? {}) }),
    buzzerSystem: normalizeBuzzerSystem({
      ...base.buzzerSystem,
      ...(raw.buzzerSystem ?? {}),
    }),
    tournament: normalizeTournament({ ...base.tournament, ...(raw.tournament ?? {}) }),
    tournamentPlans: (() => {
      const plans = normalizeTournamentPlans(raw.tournamentPlans)
      const t = normalizeTournament({ ...base.tournament, ...(raw.tournament ?? {}) })
      if (!plans.length && t.plannedRounds?.length) {
        return upsertTournamentPlan([], t)
      }
      return plans.length ? plans : upsertTournamentPlan([], t)
    })(),
    playSession: normalizePlaySession({ ...base.playSession, ...(raw.playSession ?? {}) }),
    playTimer: normalizePlayTimer({ ...base.playTimer, ...(raw.playTimer ?? {}) }),
    presentation: normalizePresentation({
      ...base.presentation,
      ...(raw.presentation ?? {}),
    }),
    scoreDisplay: normalizeScoreDisplay({
      ...base.scoreDisplay,
      ...(raw.scoreDisplay ?? {}),
    }),
    scoreAnnouncement: (() => {
      const ann = normalizeScoreAnnouncement(raw.scoreAnnouncement)
      return isScoreAnnouncementActive(ann) ? ann : null
    })(),
    scorePresentation: normalizeScorePresentation({
      ...base.scorePresentation,
      ...(raw.scorePresentation ?? {}),
    }),
    teams: normalizeTeamsList(raw.teams, base.teams),
    roundLibrary,
    selectedRoundId,
    mediaLibrary: Object.prototype.hasOwnProperty.call(raw, 'mediaLibrary')
      ? normalizeMediaLibrary(raw.mediaLibrary)
      : base.mediaLibrary,
    mediaPlayback: normalizeMediaPlayback(raw.mediaPlayback),
    stageProfiles: normalizeStageProfiles(raw.stageProfiles),
    tournamentInstances: normalizeTournamentInstances(raw.tournamentInstances),
    activeTournamentInstanceId:
      typeof raw.activeTournamentInstanceId === 'string'
        ? raw.activeTournamentInstanceId
        : base.activeTournamentInstanceId,
    tournamentEventSettings: normalizeTournamentEventSettings(
      raw.tournamentEventSettings ?? base.tournamentEventSettings,
    ),
    updatedAt: raw.updatedAt ?? Date.now(),
  }

  return migrateGameStateToMultiTournament(merged)
}

export { SAMPLE_TEAMS }

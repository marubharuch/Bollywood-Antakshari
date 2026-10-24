import { normalizeBuzzer } from '../buzzer/buzzerModel.js'
import { normalizePresentation } from '../presentation/introModel.js'
import { normalizeScoreDisplay } from '../presentation/scoreDisplayModel.js'
import {
  isScoreAnnouncementActive,
  normalizeScoreAnnouncement,
} from '../presentation/scoreAnnouncementModel.js'
import { normalizeScorePresentation } from '../presentation/scorePresentationModel.js'
import { normalizeTeam, normalizeTeamsList } from './teamModel.js'
import {
  normalizePlaySession,
  normalizePlayTimer,
  normalizeTournament,
} from './tournamentModel.js'
import { TOURNAMENT_STATUS } from './tournamentLifecycle.js'
import { getTournamentInstanceDef, TOURNAMENT_INSTANCE_DEFS } from './tournamentRegistry.js'
import { normalizeQuestionBankSelections } from '../questionBank/questionBankModel.js'

export function createEmptyTournamentInstanceBundle(instanceId) {
  const def = getTournamentInstanceDef(instanceId)
  const name = def?.name ?? 'Tournament'
  return {
    instanceId,
    tournament: normalizeTournament({
      id: instanceId,
      name,
      status: TOURNAMENT_STATUS.DRAFT,
      plannedRounds: [],
    }),
    teams: [],
    playSession: normalizePlaySession(null),
    playTimer: normalizePlayTimer(null),
    presentation: normalizePresentation(null),
    scoreDisplay: normalizeScoreDisplay(null),
    scoreAnnouncement: null,
    scorePresentation: normalizeScorePresentation(null),
    buzzer: normalizeBuzzer(null),
    eventStatus: 'idle',
    stage: name,
    question: {
      prompt: '',
      letter: '',
      hiddenAnswer: '',
      answerRevealed: false,
    },
    questionBankSelections: {},
  }
}

export function normalizeTournamentInstanceBundle(raw) {
  if (!raw || typeof raw !== 'object') {
    return createEmptyTournamentInstanceBundle('ti-quarter-final-1')
  }
  const instanceId =
    typeof raw.instanceId === 'string' && raw.instanceId.trim()
      ? raw.instanceId.trim()
      : 'ti-quarter-final-1'
  const def = getTournamentInstanceDef(instanceId)
  const tournament = normalizeTournament({
    ...raw.tournament,
    id: instanceId,
    name: def?.name ?? raw.tournament?.name,
  })
  const ann = normalizeScoreAnnouncement(raw.scoreAnnouncement)
  return {
    instanceId,
    tournament,
    teams: normalizeTeamsList(raw.teams, []).map((t, i) => normalizeTeam(t, i)),
    playSession: normalizePlaySession(raw.playSession),
    playTimer: normalizePlayTimer(raw.playTimer),
    presentation: normalizePresentation(raw.presentation),
    scoreDisplay: normalizeScoreDisplay(raw.scoreDisplay),
    scoreAnnouncement: isScoreAnnouncementActive(ann) ? ann : null,
    scorePresentation: normalizeScorePresentation(raw.scorePresentation),
    buzzer: normalizeBuzzer(raw.buzzer),
    eventStatus: raw.eventStatus ?? 'idle',
    stage: typeof raw.stage === 'string' ? raw.stage : tournament.name,
    question: {
      prompt: '',
      letter: '',
      hiddenAnswer: '',
      answerRevealed: false,
      ...(raw.question ?? {}),
    },
    questionBankSelections: normalizeQuestionBankSelections(raw.questionBankSelections),
  }
}

export function createDefaultTournamentInstancesMap() {
  /** @type {Record<string, ReturnType<typeof createEmptyTournamentInstanceBundle>>} */
  const map = {}
  for (const def of TOURNAMENT_INSTANCE_DEFS) {
    map[def.id] = createEmptyTournamentInstanceBundle(def.id)
  }
  return map
}

export function normalizeTournamentInstances(raw) {
  const base = createDefaultTournamentInstancesMap()
  if (!raw || typeof raw !== 'object') return base
  const next = { ...base }
  for (const def of TOURNAMENT_INSTANCE_DEFS) {
    if (raw[def.id]) {
      next[def.id] = normalizeTournamentInstanceBundle({
        ...raw[def.id],
        instanceId: def.id,
      })
    }
  }
  return next
}

export function captureTournamentInstanceFromState(state) {
  const id = state.activeTournamentInstanceId ?? state.tournament?.id
  const ann = normalizeScoreAnnouncement(state.scoreAnnouncement)
  return normalizeTournamentInstanceBundle({
    instanceId: id,
    tournament: state.tournament,
    teams: state.teams,
    playSession: state.playSession,
    playTimer: state.playTimer,
    presentation: state.presentation,
    scoreDisplay: state.scoreDisplay,
    scoreAnnouncement: isScoreAnnouncementActive(ann) ? ann : null,
    scorePresentation: state.scorePresentation,
    buzzer: state.buzzer,
    eventStatus: state.eventStatus,
    stage: state.stage,
    question: state.question,
    questionBankSelections: normalizeQuestionBankSelections(
      state.tournamentInstances?.[id]?.questionBankSelections,
    ),
  })
}

export function applyTournamentInstanceBundle(bundle, prevState) {
  const b = normalizeTournamentInstanceBundle(bundle)
  return {
    tournament: b.tournament,
    teams: b.teams,
    playSession: b.playSession,
    playTimer: b.playTimer,
    presentation: b.presentation,
    scoreDisplay: b.scoreDisplay,
    scoreAnnouncement: b.scoreAnnouncement,
    scorePresentation: b.scorePresentation,
    buzzer: b.buzzer,
    eventStatus: b.eventStatus,
    stage: b.stage ?? b.tournament.name,
    question: b.question ?? prevState.question,
  }
}

export function commitActiveTournamentInstance(state) {
  const id = state.activeTournamentInstanceId
  if (!id || !state.tournamentInstances) return state
  return {
    ...state,
    tournamentInstances: {
      ...state.tournamentInstances,
      [id]: captureTournamentInstanceFromState(state),
    },
  }
}

/** @returns {import('./tournamentRegistry.js').TournamentInstanceDisplayStatus} */
export function deriveInstanceDisplayStatus(bundle, stageProfileValid) {
  const t = bundle?.tournament
  const teams = bundle?.teams ?? []
  if (!stageProfileValid) return 'not_configured'
  if (!t?.plannedRounds?.length) return 'not_configured'
  if (teams.length < 2) return 'not_configured'
  if (t.status === TOURNAMENT_STATUS.COMPLETED) return 'completed'
  if (
    t.status === TOURNAMENT_STATUS.IN_PROGRESS ||
    t.status === TOURNAMENT_STATUS.PAUSED ||
    t.status === TOURNAMENT_STATUS.STOPPED
  ) {
    return 'in_progress'
  }
  if (t.status === TOURNAMENT_STATUS.READY) return 'ready'
  return 'not_configured'
}

export function sumTeamScores(teams) {
  return (teams ?? []).reduce((sum, t) => sum + (Number(t.score) || 0), 0)
}

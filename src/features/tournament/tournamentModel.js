import { normalizeRound } from '../rounds/roundModel.js'
import {
  MAIN_ROUND_TYPE,
  resolveMainRoundType,
} from '../rounds/mainRoundType.js'
import { normalizeRoundQuestions } from '../rounds/roundQuestionModel.js'
import {
  resolveRoundPlayQuestions,
  RESOLVE_SOURCE,
} from '../questionLibrary/resolveRoundPlayQuestions.js'
import { normalizeTournamentStatus, TOURNAMENT_STATUS } from './tournamentLifecycle.js'

export const PLAY_TIMER_SECONDS = 10
export const BUZZER_ANSWER_TIMER_SECONDS = 15

export const TOURNAMENT_STAGES = [
  'Quarter Final',
  'Semi Final',
  'Final',
  'Practice',
]

export const ROUND_PLAY_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
}

export const QUESTION_STATUS = {
  PENDING: 'pending',
  CURRENT: 'current',
  COMPLETED: 'completed',
}

export const ANCHOR_STEPS = {
  MODE_SELECT: 'mode_select',
  TESTING_HUB: 'testing_hub',
  TOURNAMENT_SELECT: 'tournament_select',
  ROUND_SELECT: 'round_select',
  ROUND_START: 'round_start',
  QUESTION_PICK: 'question_pick',
  QUESTION_LIVE: 'question_live',
  SIMPLE_ROUND_LIVE: 'simple_round_live',
  // legacy (migrated on read)
  START_ROUND: 'round_start',
  SELECT_QUESTION: 'question_pick',
  PLAY_QUESTION: 'play_question',
  SCORING: 'scoring',
  ROUND_SUMMARY: 'round_summary',
}

export function createTournamentId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `tournament-${crypto.randomUUID()}`
  }
  return `tournament-${Date.now()}`
}

export function snapshotRound(round) {
  if (!round) return null
  const questions = normalizeRoundQuestions(round.questions ?? [])
  const normalized = normalizeRound({
    ...round,
    questions,
  })
  return JSON.parse(JSON.stringify(normalized))
}

export function createPlannedRound(libraryRound) {
  const snapshot = snapshotRound(libraryRound)
  if (!snapshot) return null
  return {
    id: `plan-${snapshot.id}-${Date.now()}`,
    libraryRoundId: snapshot.id,
    snapshot,
    roundStatus: ROUND_PLAY_STATUS.PENDING,
    questionProgress: {},
  }
}

export function normalizePlannedRound(raw) {
  if (!raw || typeof raw !== 'object') return null
  const snapshot = raw.snapshot ? normalizeRound(raw.snapshot) : null
  if (!snapshot) return null
  const roundStatus = Object.values(ROUND_PLAY_STATUS).includes(raw.roundStatus)
    ? raw.roundStatus
    : ROUND_PLAY_STATUS.PENDING
  return {
    id: typeof raw.id === 'string' ? raw.id : `plan-${snapshot.id}`,
    libraryRoundId: typeof raw.libraryRoundId === 'string' ? raw.libraryRoundId : snapshot.id,
    snapshot,
    roundStatus,
    questionProgress:
      raw.questionProgress && typeof raw.questionProgress === 'object'
        ? raw.questionProgress
        : {},
    teamRoundScores:
      raw.teamRoundScores && typeof raw.teamRoundScores === 'object'
        ? raw.teamRoundScores
        : {},
    simpleScoresFinalized: Boolean(raw.simpleScoresFinalized),
    stoppedEarly: Boolean(raw.stoppedEarly),
    stageSlotId: typeof raw.stageSlotId === 'string' ? raw.stageSlotId : null,
    allocatedQuestionIds: Array.isArray(raw.allocatedQuestionIds)
      ? raw.allocatedQuestionIds.filter((id) => typeof id === 'string')
      : [],
  }
}

export function normalizePlaySettings(raw) {
  const base = {
    questionOrderShuffle: false,
    teamOrderMode: 'sequential',
    allowTeamShuffle: false,
  }
  if (!raw || typeof raw !== 'object') return base
  return {
    questionOrderShuffle: Boolean(raw.questionOrderShuffle),
    teamOrderMode: raw.teamOrderMode === 'shuffle' ? 'shuffle' : 'sequential',
    allowTeamShuffle: Boolean(raw.allowTeamShuffle),
  }
}

export function normalizeTournament(raw) {
  const base = {
    id: createTournamentId(),
    name: 'Quarter Final',
    status: 'draft',
    plannedRounds: [],
    currentRoundIndex: 0,
    configuredAt: null,
    startedAt: null,
    playSettings: normalizePlaySettings(null),
  }
  if (!raw || typeof raw !== 'object') return base

  const plannedRounds = Array.isArray(raw.plannedRounds)
    ? raw.plannedRounds.map(normalizePlannedRound).filter(Boolean)
    : []

  const status = normalizeTournamentStatus(raw.status ?? base.status)

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : base.id,
    name:
      typeof raw.name === 'string' && raw.name.trim()
        ? raw.name.trim()
        : base.name,
    status,
    plannedRounds,
    currentRoundIndex:
      typeof raw.currentRoundIndex === 'number' && raw.currentRoundIndex >= 0
        ? raw.currentRoundIndex
        : 0,
    configuredAt: typeof raw.configuredAt === 'number' ? raw.configuredAt : null,
    startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : null,
    playSettings: normalizePlaySettings(raw.playSettings),
  }
}

export function normalizeTournamentPlans(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((t) => normalizeTournament(t)).filter((t) => t.id)
}

export function upsertTournamentPlan(plans, tournament) {
  const normalized = normalizeTournament(tournament)
  const list = normalizeTournamentPlans(plans).filter((p) => p.id !== normalized.id)
  return [...list, normalized]
}

export function migrateAnchorStep(step) {
  if (step === ANCHOR_STEPS.ROUND_SUMMARY) {
    return ANCHOR_STEPS.ROUND_SELECT
  }
  if (step === ANCHOR_STEPS.PLAY_QUESTION || step === ANCHOR_STEPS.SCORING) {
    return ANCHOR_STEPS.QUESTION_LIVE
  }
  if (
    step === ANCHOR_STEPS.MODE_SELECT ||
    step === ANCHOR_STEPS.TESTING_HUB ||
    step === ANCHOR_STEPS.TOURNAMENT_SELECT ||
    step === ANCHOR_STEPS.ROUND_SELECT ||
    step === ANCHOR_STEPS.ROUND_START ||
    step === ANCHOR_STEPS.QUESTION_PICK ||
    step === ANCHOR_STEPS.QUESTION_LIVE ||
    step === ANCHOR_STEPS.SIMPLE_ROUND_LIVE
  ) {
    return step
  }
  return ANCHOR_STEPS.TOURNAMENT_SELECT
}

export function normalizePlaySession(raw) {
  const base = {
    anchorStep: ANCHOR_STEPS.TOURNAMENT_SELECT,
    entryResolved: false,
    playPhase: 'pick',
    activePlanRoundId: null,
    pendingPlanRoundId: null,
    roundCompleteNotice: null,
    simpleScoredTeamIds: [],
    questionIndex: 0,
    questionOrder: [],
    selectedMediaId: null,
    questions: [],
    assignedTeamId: null,
    manualTeamPick: false,
    teamRotation: {
      cycleOrder: [],
      cycleIndex: 0,
      cycleNumber: 1,
    },
    scoreAppliedForQuestionId: null,
    lastScoreFingerprint: null,
    lastScoreAt: 0,
    timerEpoch: 0,
  }
  if (!raw || typeof raw !== 'object') return base

  return {
    anchorStep: migrateAnchorStep(raw.anchorStep),
    playPhase: raw.playPhase === 'live' ? 'live' : 'pick',
    activePlanRoundId:
      typeof raw.activePlanRoundId === 'string' ? raw.activePlanRoundId : null,
    questionIndex:
      typeof raw.questionIndex === 'number' && raw.questionIndex >= 0
        ? raw.questionIndex
        : 0,
    questionOrder: Array.isArray(raw.questionOrder)
      ? raw.questionOrder.map((n) => Number(n)).filter((n) => !Number.isNaN(n))
      : [],
    selectedMediaId:
      typeof raw.selectedMediaId === 'string' ? raw.selectedMediaId : null,
    questions: Array.isArray(raw.questions) ? raw.questions : [],
    assignedTeamId:
      typeof raw.assignedTeamId === 'string' ? raw.assignedTeamId : null,
    manualTeamPick: Boolean(raw.manualTeamPick),
    teamRotation: {
      cycleOrder: Array.isArray(raw.teamRotation?.cycleOrder)
        ? raw.teamRotation.cycleOrder
        : [],
      cycleIndex:
        typeof raw.teamRotation?.cycleIndex === 'number'
          ? raw.teamRotation.cycleIndex
          : 0,
      cycleNumber:
        typeof raw.teamRotation?.cycleNumber === 'number'
          ? raw.teamRotation.cycleNumber
          : 1,
    },
    scoreAppliedForQuestionId:
      typeof raw.scoreAppliedForQuestionId === 'string'
        ? raw.scoreAppliedForQuestionId
        : null,
    lastScoreFingerprint:
      typeof raw.lastScoreFingerprint === 'string' ? raw.lastScoreFingerprint : null,
    lastScoreAt: typeof raw.lastScoreAt === 'number' ? raw.lastScoreAt : 0,
    timerEpoch: typeof raw.timerEpoch === 'number' ? raw.timerEpoch : 0,
    entryResolved: Boolean(raw.entryResolved),
    pendingPlanRoundId:
      typeof raw.pendingPlanRoundId === 'string' ? raw.pendingPlanRoundId : null,
    roundCompleteNotice:
      typeof raw.roundCompleteNotice === 'string' ? raw.roundCompleteNotice : null,
    simpleScoredTeamIds: Array.isArray(raw.simpleScoredTeamIds)
      ? raw.simpleScoredTeamIds.filter((id) => typeof id === 'string')
      : [],
  }
}

export function normalizePlayTimer(raw) {
  const baseTotal = PLAY_TIMER_SECONDS
  const base = {
    enabled: true,
    projectorVisible: false,
    totalSeconds: baseTotal,
    remainingSeconds: baseTotal,
    running: false,
    locked: false,
    epoch: 0,
    kind: 'question',
  }
  if (!raw || typeof raw !== 'object') return base
  const total =
    typeof raw.totalSeconds === 'number' && raw.totalSeconds > 0
      ? Math.round(raw.totalSeconds)
      : baseTotal
  let remaining =
    typeof raw.remainingSeconds === 'number'
      ? Math.round(raw.remainingSeconds)
      : total
  remaining = Math.min(total, Math.max(0, remaining))
  const kind = raw.kind === 'buzzer_answer' ? 'buzzer_answer' : 'question'
  return {
    enabled: true,
    projectorVisible: Boolean(raw.projectorVisible),
    totalSeconds: total,
    remainingSeconds: remaining,
    running: Boolean(raw.running) && remaining > 0 && !raw.locked,
    locked: Boolean(raw.locked) || remaining <= 0,
    epoch: typeof raw.epoch === 'number' ? raw.epoch : 0,
    kind,
  }
}

export function createFreshPlayTimer(epoch = 0, options = {}) {
  const total = options.totalSeconds ?? PLAY_TIMER_SECONDS
  const kind = options.kind ?? 'question'
  return normalizePlayTimer({
    enabled: true,
    projectorVisible: false,
    totalSeconds: total,
    remainingSeconds: total,
    running: false,
    locked: false,
    epoch,
    kind,
  })
}

export function createBuzzerAnswerTimer(epoch = 0, running = false) {
  return normalizePlayTimer({
    enabled: true,
    projectorVisible: running,
    totalSeconds: BUZZER_ANSWER_TIMER_SECONDS,
    remainingSeconds: BUZZER_ANSWER_TIMER_SECONDS,
    running,
    locked: false,
    epoch,
    kind: 'buzzer_answer',
  })
}

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function playQuestionFromLibraryEntry(q, round, index, mainType) {
  const n = index + 1
  let prompt = `${round.name} — Question ${n}`
  let contentType = 'text'
  if (mainType === MAIN_ROUND_TYPE.WORD) {
    prompt = (q.word || '').trim() || prompt
  } else if (mainType === MAIN_ROUND_TYPE.MULTI_WORD) {
    const parts = (q.words ?? []).map((w) => (w || '').trim()).filter(Boolean)
    prompt = parts.length ? parts.join(' · ') : prompt
  } else if (mainType === MAIN_ROUND_TYPE.IMAGE) {
    const clue = (q.clue || q.word || '').trim()
    prompt = clue || prompt
    contentType = 'image'
  } else if (mainType === MAIN_ROUND_TYPE.AUDIO) {
    prompt = (q.anchorNotes || '').trim() || `Audio question ${n}`
    contentType = 'audio'
  } else if (mainType === MAIN_ROUND_TYPE.VIDEO) {
    prompt = (q.anchorNotes || '').trim() || `Video question ${n}`
    contentType = 'video'
  }
  const hiddenAnswer =
    (q.acceptedAnswer || '').trim() ||
    round.customRule ||
    round.description ||
    round.instructions ||
    'Answer TBD'
  return {
    id: q.id,
    index,
    status: QUESTION_STATUS.PENDING,
    prompt,
    letter: String.fromCharCode(65 + (index % 26)),
    hiddenAnswer,
    mediaId: q.mediaId ?? null,
    anchorNotes: q.anchorNotes ?? '',
    contentType,
    libraryQuestionId: q.id,
    segmentStartSeconds: q.segmentStartSeconds ?? null,
    segmentEndSeconds: q.segmentEndSeconds ?? null,
    videoStartMuted: Boolean(q.videoStartMuted),
  }
}

export function buildQuestionQueue(round, shuffleQuestions = false, options = {}) {
  if (!round) return { questions: [], questionOrder: [], resolveMeta: null }
  const mainType = resolveMainRoundType(round)
  if (mainType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    return { questions: [], questionOrder: [], resolveMeta: null }
  }

  const resolved = resolveRoundPlayQuestions(round, options.questionLibrary ?? [], {
    allocatedQuestionIds: options.allocatedQuestionIds,
    allowLegacyEmbedded: true,
    allowSynthetic: Boolean(options.allowSynthetic),
  })

  const libraryQs = resolved.questions
  const resolveMeta = {
    source: resolved.source,
    errors: resolved.errors,
    usedLegacyFallback: resolved.usedLegacyFallback,
    usedSyntheticFallback: resolved.usedSyntheticFallback,
  }

  if (resolved.errors.length > 0 && libraryQs.length === 0) {
    return { questions: [], questionOrder: [], resolveMeta }
  }

  if (libraryQs.length > 0) {
    const items = libraryQs.map((q, i) => playQuestionFromLibraryEntry(q, round, i, mainType))
    const order = shuffleQuestions
      ? shuffleArray(items.map((_, i) => i))
      : items.map((_, i) => i)
    return { questions: items, questionOrder: order, resolveMeta }
  }

  const count = Math.max(0, round.rules?.questionCount ?? 0)
  if (count === 0) {
    return { questions: [], questionOrder: [], resolveMeta }
  }

  if (options.allowSynthetic) {
    const items = Array.from({ length: count }, (_, i) => ({
      id: `q-${i + 1}`,
      index: i,
      status: QUESTION_STATUS.PENDING,
      prompt:
        round.rules?.mediaRequired
          ? `Question ${i + 1} — media round`
          : `${round.name} — Question ${i + 1}`,
      letter: String.fromCharCode(65 + (i % 26)),
      hiddenAnswer: round.customRule || round.description || round.instructions || 'Answer TBD',
      mediaId: null,
    }))
    const order = shuffleQuestions ? shuffleArray(items.map((_, i) => i)) : items.map((_, i) => i)
    return {
      questions: items,
      questionOrder: order,
      resolveMeta: {
        source: RESOLVE_SOURCE.SYNTHETIC,
        errors: ['Synthetic question slots generated (allowSynthetic).'],
        usedLegacyFallback: false,
        usedSyntheticFallback: true,
      },
    }
  }

  return { questions: [], questionOrder: [], resolveMeta }
}

export function buildTeamCycle(teams, playSettings) {
  const ids = teams.map((t) => t.id)
  if (!ids.length) return []
  const useShuffle =
    playSettings.teamOrderMode === 'shuffle' && playSettings.allowTeamShuffle
  return useShuffle ? shuffleArray(ids) : ids
}

export function getNextTeamFromRotation(teams, playSettings, rotation) {
  let cycleOrder = rotation?.cycleOrder ?? []
  let cycleIndex = rotation?.cycleIndex ?? 0
  let cycleNumber = rotation?.cycleNumber ?? 1

  if (!cycleOrder.length || cycleIndex >= cycleOrder.length) {
    cycleOrder = buildTeamCycle(teams, playSettings)
    cycleIndex = 0
    cycleNumber = (rotation?.cycleNumber ?? 0) + 1
  }

  const teamId = cycleOrder[cycleIndex]
  return {
    teamId,
    teamRotation: {
      cycleOrder,
      cycleIndex: cycleIndex + 1,
      cycleNumber,
    },
  }
}

export function validateTournamentConfig(tournament, teams) {
  const errors = []
  if (!tournament?.name?.trim()) errors.push('Tournament name is required.')
  if (!teams?.length || teams.length < 2) errors.push('At least two teams are required.')
  if (!tournament?.plannedRounds?.length) {
    errors.push('Add at least one round to the tournament plan.')
  }
  return { valid: errors.length === 0, errors }
}

export function getActivePlannedRound(tournament) {
  if (!tournament?.plannedRounds?.length) return null
  const byId = tournament.plannedRounds.find(
    (p) => p.roundStatus === ROUND_PLAY_STATUS.ACTIVE,
  )
  if (byId) return byId
  const idx = tournament.currentRoundIndex ?? 0
  return tournament.plannedRounds[idx] ?? null
}

export function getActiveRoundSnapshot(tournament, playSession) {
  if (playSession?.activePlanRoundId) {
    const found = tournament?.plannedRounds?.find(
      (p) => p.id === playSession.activePlanRoundId,
    )
    return found?.snapshot ?? null
  }
  return getActivePlannedRound(tournament)?.snapshot ?? null
}

export function getPlayableTournaments(tournament, tournamentPlans) {
  const plans = normalizeTournamentPlans(tournamentPlans)
  const current = normalizeTournament(tournament)
  const merged = upsertTournamentPlan(plans, current)
  return merged.filter(
    (t) =>
      t.status === TOURNAMENT_STATUS.READY ||
      t.status === TOURNAMENT_STATUS.IN_PROGRESS ||
      t.status === TOURNAMENT_STATUS.PAUSED ||
      t.status === TOURNAMENT_STATUS.STOPPED ||
      t.status === TOURNAMENT_STATUS.COMPLETED ||
      (t.plannedRounds?.length > 0 && t.status !== TOURNAMENT_STATUS.DRAFT),
  )
}

export function findNextQuestionIndex(playSession) {
  const order = playSession.questionOrder?.length
    ? playSession.questionOrder
    : playSession.questions.map((_, i) => i)
  const questions = playSession.questions ?? []
  for (const idx of order) {
    const q = questions[idx]
    if (q && q.status !== QUESTION_STATUS.COMPLETED) return idx
  }
  return -1
}

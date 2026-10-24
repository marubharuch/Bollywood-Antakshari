import {
  MAIN_ROUND_TYPE,
  normalizeMainRoundType,
  playTypeFromMainAndBuzzer,
  syncRulesForMainType,
} from './mainRoundType.js'
import { ROUND_PLAY_TYPE } from './roundPlayType.js'
import { countSelectedQuestions, normalizeRoundQuestions } from './roundQuestionModel.js'

/** @typedef {import('./roundTypes.js').RoundDefinition} RoundDefinition */

export const ROUND_CATEGORIES = [
  { id: 'antakshari', label: 'Antakshari' },
  { id: 'audio', label: 'Audio / Mukhda' },
  { id: 'visual', label: 'Visual / Video' },
  { id: 'quiz', label: 'Bollywood Quiz' },
  { id: 'mixed', label: 'Mixed / Variety' },
  { id: 'custom', label: 'Custom' },
]

export function createRoundId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `round-${crypto.randomUUID()}`
  }
  return `round-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const DEFAULT_SCORING = {
  correctPoints: 10,
  wrongPenalty: 5,
  passPoints: 0,
}

const DEFAULT_TIMING = {
  useTimer: true,
  timeLimitSeconds: 30,
}

const DEFAULT_RULES = {
  buzzerEnabled: true,
  mediaRequired: false,
  questionCount: 5,
  maxAttemptsPerTeam: 1,
}

/**
 * @param {Partial<RoundDefinition>} raw
 * @returns {RoundDefinition}
 */
export function normalizeRound(raw = {}) {
  const now = Date.now()
  const useTimer = Boolean(raw.timing?.useTimer ?? DEFAULT_TIMING.useTimer)
  let timeLimitSeconds = raw.timing?.timeLimitSeconds ?? DEFAULT_TIMING.timeLimitSeconds
  if (!useTimer) {
    timeLimitSeconds = null
  } else if (typeof timeLimitSeconds !== 'number' || timeLimitSeconds < 1) {
    timeLimitSeconds = DEFAULT_TIMING.timeLimitSeconds
  }

  const rulesDraft = {
    buzzerEnabled: Boolean(raw.rules?.buzzerEnabled ?? DEFAULT_RULES.buzzerEnabled),
    mediaRequired: Boolean(raw.rules?.mediaRequired ?? DEFAULT_RULES.mediaRequired),
    questionCount: clampInt(raw.rules?.questionCount, 0, 999, DEFAULT_RULES.questionCount),
    maxAttemptsPerTeam: clampInt(
      raw.rules?.maxAttemptsPerTeam,
      1,
      99,
      DEFAULT_RULES.maxAttemptsPerTeam,
    ),
  }
  const mainRoundType = normalizeMainRoundType(raw.mainRoundType, {
    ...raw,
    rules: rulesDraft,
  })
  let rules = syncRulesForMainType(mainRoundType, rulesDraft)
  if (mainRoundType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    rules = { ...rules, buzzerEnabled: Boolean(raw.rules?.buzzerEnabled ?? false) }
  }
  const playType = playTypeFromMainAndBuzzer(mainRoundType, rules.buzzerEnabled)
  const questions = normalizeRoundQuestions(raw.questions)
  if (questions.length > 0 && mainRoundType !== MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    const selected = countSelectedQuestions(questions)
    rules = { ...rules, questionCount: selected }
  }

  return {
    id:
      typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createRoundId(),
    mainRoundType,
    playType,
    customRule: typeof raw.customRule === 'string' ? raw.customRule.trim() : '',
    questionBankId:
      typeof raw.questionBankId === 'string' && raw.questionBankId.trim()
        ? raw.questionBankId.trim()
        : null,
    questions,
    name: typeof raw.name === 'string' ? raw.name.trim() : 'Untitled Round',
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    instructions:
      typeof raw.instructions === 'string' ? raw.instructions.trim() : '',
    category:
      typeof raw.category === 'string' && raw.category.trim()
        ? raw.category.trim()
        : 'custom',
    scoring: {
      correctPoints: clampInt(raw.scoring?.correctPoints, 0, 999, DEFAULT_SCORING.correctPoints),
      wrongPenalty: clampInt(raw.scoring?.wrongPenalty, 0, 999, DEFAULT_SCORING.wrongPenalty),
      passPoints: clampInt(raw.scoring?.passPoints, 0, 999, DEFAULT_SCORING.passPoints),
    },
    timing: {
      useTimer,
      timeLimitSeconds,
    },
    rules,
    active: raw.active !== false,
    isTemplate: Boolean(raw.isTemplate),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  }
}

function clampInt(value, min, max, fallback) {
  const n = Number(value)
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/**
 * @param {unknown} rawList
 * @param {RoundDefinition[]} seedTemplates
 */
export function normalizeRoundLibrary(rawList, seedTemplates) {
  if (!Array.isArray(rawList)) {
    return seedTemplates.map((round) => normalizeRound(round))
  }
  return rawList.map((round) => normalizeRound(round)).filter((r) => r.id)
}

export function createEmptyRoundDraft() {
  return normalizeRound({
    name: '',
    description: '',
    instructions: '',
    category: 'custom',
    active: true,
    isTemplate: false,
    mainRoundType: MAIN_ROUND_TYPE.WORD,
    playType: ROUND_PLAY_TYPE.NON_BUZZER_QUESTION,
    questions: [],
    customRule: '',
  })
}

export { ROUND_PLAY_TYPE, resolveRoundPlayType, roundPlayTypeLabel } from './roundPlayType.js'
export {
  MAIN_ROUND_TYPE,
  mainRoundTypeLabel,
  mainTypeNeedsQuestionLibrary,
  resolveMainRoundType,
} from './mainRoundType.js'

/** Small starter set — library model supports ~65+ entries later. */
export const EXAMPLE_ROUND_TEMPLATES = [
  {
    id: 'template-antakshari-chain',
    name: 'Antakshari Chain',
    description: 'Classic letter-chain singing round.',
    instructions: 'Name a Bollywood song starting with the announced letter.',
    category: 'antakshari',
    scoring: { correctPoints: 10, wrongPenalty: 5, passPoints: 0 },
    timing: { useTimer: true, timeLimitSeconds: 30 },
    rules: {
      buzzerEnabled: true,
      mediaRequired: false,
      questionCount: 8,
      maxAttemptsPerTeam: 1,
    },
    active: true,
    isTemplate: true,
  },
  {
    id: 'template-mukhda-challenge',
    name: 'Mukhda Challenge',
    description: 'Identify the song from a short audio clip.',
    instructions: 'Buzz in and name the song after hearing the mukhda.',
    category: 'audio',
    scoring: { correctPoints: 15, wrongPenalty: 5, passPoints: 0 },
    timing: { useTimer: true, timeLimitSeconds: 20 },
    rules: {
      buzzerEnabled: true,
      mediaRequired: true,
      questionCount: 6,
      maxAttemptsPerTeam: 2,
    },
    active: true,
    isTemplate: true,
  },
  {
    id: 'template-lyrics-lightning',
    name: 'Lyrics Lightning',
    description: 'Fast lyric completion without long clips.',
    instructions: 'Complete the next line of the lyrics shown on screen.',
    category: 'quiz',
    scoring: { correctPoints: 8, wrongPenalty: 3, passPoints: 2 },
    timing: { useTimer: true, timeLimitSeconds: 15 },
    rules: {
      buzzerEnabled: true,
      mediaRequired: false,
      questionCount: 10,
      maxAttemptsPerTeam: 1,
    },
    active: true,
    isTemplate: true,
  },
  {
    id: 'template-pass-round',
    name: 'Pass-Friendly Warm-Up',
    description: 'Low-pressure round with pass points.',
    instructions: 'Teams may pass once per question without penalty beyond pass points.',
    category: 'mixed',
    scoring: { correctPoints: 5, wrongPenalty: 0, passPoints: 1 },
    timing: { useTimer: false, timeLimitSeconds: null },
    rules: {
      buzzerEnabled: false,
      mediaRequired: false,
      questionCount: 5,
      maxAttemptsPerTeam: 2,
    },
    active: true,
    isTemplate: true,
  },
]

export function getCategoryLabel(categoryId) {
  return ROUND_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId
}

/**
 * @param {RoundDefinition} round
 */
export function formatRoundRulesSummary(round) {
  if (!round) return 'No round selected.'
  const timer = round.timing.useTimer
    ? `${round.timing.timeLimitSeconds}s per question`
    : 'No timer'
  return [
    `+${round.scoring.correctPoints} correct · −${round.scoring.wrongPenalty} wrong · pass +${round.scoring.passPoints}`,
    `${timer} · ${round.rules.questionCount} questions · ${round.rules.maxAttemptsPerTeam} attempt(s)/team`,
    `Buzzer ${round.rules.buzzerEnabled ? 'ON' : 'OFF'} · Media ${round.rules.mediaRequired ? 'required' : 'optional'}`,
  ].join(' · ')
}

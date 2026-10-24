import { playTypeFromMainAndBuzzer, resolveMainRoundType } from './mainRoundType.js'

export const ROUND_PLAY_TYPE = {
  SIMPLE_ANTAKSHARI: 'simple_antakshari',
  NON_BUZZER_QUESTION: 'non_buzzer_question',
  BUZZER_QUESTION: 'buzzer_question',
}

const PLAY_TYPES = Object.values(ROUND_PLAY_TYPE)

/**
 * Explicit round type from library, with migration from legacy rules.
 * @param {import('./roundModel.js').RoundDefinition | null | undefined} round
 */

export function resolveRoundPlayType(round) {
  if (round?.mainRoundType || round?.category) {
    const main = resolveMainRoundType(round)
    return playTypeFromMainAndBuzzer(main, Boolean(round?.rules?.buzzerEnabled))
  }
  if (round?.playType && PLAY_TYPES.includes(round.playType)) {
    return round.playType
  }
  const buzzer = Boolean(round?.rules?.buzzerEnabled)
  const count = round?.rules?.questionCount ?? 5
  if (!buzzer && count <= 0) return ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI
  if (buzzer) return ROUND_PLAY_TYPE.BUZZER_QUESTION
  return ROUND_PLAY_TYPE.NON_BUZZER_QUESTION
}

export function normalizeRoundPlayType(raw, roundForMigration) {
  if (typeof raw === 'string' && PLAY_TYPES.includes(raw)) return raw
  return resolveRoundPlayType(roundForMigration)
}

export function roundPlayTypeLabel(type) {
  switch (type) {
    case ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI:
      return 'Simple Antakshari'
    case ROUND_PLAY_TYPE.NON_BUZZER_QUESTION:
      return 'Non-Buzzer Question Round'
    case ROUND_PLAY_TYPE.BUZZER_QUESTION:
      return 'Buzzer Question Round'
    default:
      return 'Round'
  }
}

export function syncRulesForPlayType(playType, rules = {}) {
  const next = { ...rules }
  if (playType === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI) {
    next.buzzerEnabled = false
    next.questionCount = 0
  } else if (playType === ROUND_PLAY_TYPE.NON_BUZZER_QUESTION) {
    next.buzzerEnabled = false
    if ((next.questionCount ?? 0) < 1) next.questionCount = 5
  } else if (playType === ROUND_PLAY_TYPE.BUZZER_QUESTION) {
    next.buzzerEnabled = true
    if ((next.questionCount ?? 0) < 1) next.questionCount = 5
  }
  return next
}

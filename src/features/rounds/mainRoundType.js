import { ROUND_PLAY_TYPE } from './roundPlayType.js'

export const MAIN_ROUND_TYPE = {
  SIMPLE_ANTAKSHARI: 'simple_antakshari',
  WORD: 'word',
  MULTI_WORD: 'multi_word',
  AUDIO: 'audio',
  VIDEO: 'video',
  IMAGE: 'image',
}

const MAIN_TYPES = Object.values(MAIN_ROUND_TYPE)

export const MAIN_ROUND_TYPE_LABELS = {
  [MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI]: 'સાદી અંતાક્ષરી',
  [MAIN_ROUND_TYPE.WORD]: 'શબ્દ',
  [MAIN_ROUND_TYPE.MULTI_WORD]: 'મલ્ટી-શબ્દ',
  [MAIN_ROUND_TYPE.AUDIO]: 'Audio',
  [MAIN_ROUND_TYPE.VIDEO]: 'Video',
  [MAIN_ROUND_TYPE.IMAGE]: 'Image',
}

export function mainRoundTypeLabel(type) {
  return MAIN_ROUND_TYPE_LABELS[type] ?? type ?? '—'
}

/**
 * @param {object | null | undefined} round
 */
export function resolveMainRoundType(round) {
  if (round?.mainRoundType && MAIN_TYPES.includes(round.mainRoundType)) {
    return round.mainRoundType
  }
  const category = (round?.category ?? '').trim()
  if (category === 'antakshari') return MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI
  if (category === 'audio') return MAIN_ROUND_TYPE.AUDIO
  if (category === 'visual') return MAIN_ROUND_TYPE.VIDEO
  const buzzer = Boolean(round?.rules?.buzzerEnabled)
  const count = round?.rules?.questionCount ?? 5
  if (!buzzer && count <= 0) return MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI
  if (round?.rules?.mediaRequired) {
    if (category === 'visual') return MAIN_ROUND_TYPE.VIDEO
    return MAIN_ROUND_TYPE.AUDIO
  }
  if (round?.playType === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI) {
    return MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI
  }
  return MAIN_ROUND_TYPE.WORD
}

export function normalizeMainRoundType(raw, roundForMigration) {
  if (typeof raw === 'string' && MAIN_TYPES.includes(raw)) return raw
  return resolveMainRoundType(roundForMigration)
}

export function mainTypeNeedsQuestionLibrary(type) {
  return type !== MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI
}

export function playTypeFromMainAndBuzzer(mainType, buzzerEnabled) {
  if (mainType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    return ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI
  }
  if (buzzerEnabled) return ROUND_PLAY_TYPE.BUZZER_QUESTION
  return ROUND_PLAY_TYPE.NON_BUZZER_QUESTION
}

export function syncRulesForMainType(mainType, rules = {}) {
  const next = { ...rules }
  if (mainType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    next.questionCount = 0
    next.mediaRequired = false
  } else if (
    mainType === MAIN_ROUND_TYPE.AUDIO ||
    mainType === MAIN_ROUND_TYPE.VIDEO ||
    mainType === MAIN_ROUND_TYPE.IMAGE
  ) {
    next.mediaRequired = true
    if ((next.questionCount ?? 0) < 1) next.questionCount = 5
  } else {
    next.mediaRequired = false
    if ((next.questionCount ?? 0) < 1) next.questionCount = 5
  }
  return next
}

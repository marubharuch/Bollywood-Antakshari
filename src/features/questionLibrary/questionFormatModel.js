import { MAIN_ROUND_TYPE, resolveMainRoundType } from '../rounds/mainRoundType.js'
import { QUESTION_BANK_ID } from '../questionBank/questionBankIds.js'

/** Stable format ids — independent of editable round display names. */
export const QUESTION_FORMAT = {
  LEGACY_UNSPECIFIED: 'legacy_unspecified',
  WORD_SINGLE: 'word_single',
  WORD_TRIPLE: 'word_triple',
  WORD_IN_MUKHADA: 'word_in_mukhada',
  AUDIO_ANTARA_MUKHADA: 'audio_antara_mukhada',
  AUDIO_DHOON: 'audio_dhoon',
  VIDEO_CHITRAHAAR: 'video_chitrahaar',
  VIDEO_ANTARA_MUKHADA: 'video_antara_mukhada',
  IMAGE_CLUE: 'image_clue',
  SIMPLE_ANTAKSHARI: 'simple_antakshari',
}

const ALL_FORMATS = new Set(Object.values(QUESTION_FORMAT))

export function normalizeQuestionFormat(raw) {
  if (typeof raw === 'string' && ALL_FORMATS.has(raw)) return raw
  return null
}

/**
 * Infer format from structural round fields only (never from display name).
 * @param {object | null | undefined} round normalized round
 */
export function inferQuestionFormatForRound(round) {
  const explicit = normalizeQuestionFormat(round?.questionFormat)
  if (explicit) return explicit

  const mainType = resolveMainRoundType(round)
  if (mainType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    return QUESTION_FORMAT.SIMPLE_ANTAKSHARI
  }

  const bankId =
    typeof round?.questionBankId === 'string' && round.questionBankId.trim()
      ? round.questionBankId.trim()
      : null
  if (bankId === QUESTION_BANK_ID.MUKHADA_WORD_32) {
    return QUESTION_FORMAT.WORD_IN_MUKHADA
  }

  if (mainType === MAIN_ROUND_TYPE.WORD) return QUESTION_FORMAT.WORD_SINGLE
  if (mainType === MAIN_ROUND_TYPE.MULTI_WORD) return QUESTION_FORMAT.WORD_TRIPLE
  if (mainType === MAIN_ROUND_TYPE.IMAGE) return QUESTION_FORMAT.IMAGE_CLUE
  if (mainType === MAIN_ROUND_TYPE.AUDIO) return QUESTION_FORMAT.LEGACY_UNSPECIFIED
  if (mainType === MAIN_ROUND_TYPE.VIDEO) return QUESTION_FORMAT.LEGACY_UNSPECIFIED

  return QUESTION_FORMAT.LEGACY_UNSPECIFIED
}

const FORMAT_LABELS = {
  [QUESTION_FORMAT.LEGACY_UNSPECIFIED]: 'Legacy / unspecified',
  [QUESTION_FORMAT.WORD_SINGLE]: 'Single word',
  [QUESTION_FORMAT.WORD_TRIPLE]: 'Three words',
  [QUESTION_FORMAT.WORD_IN_MUKHADA]: 'Word-in-Mukhada',
  [QUESTION_FORMAT.AUDIO_ANTARA_MUKHADA]: 'Audio Antara-Mukhada',
  [QUESTION_FORMAT.AUDIO_DHOON]: 'Audio Dhoon',
  [QUESTION_FORMAT.VIDEO_CHITRAHAAR]: 'Video Chitrahaar',
  [QUESTION_FORMAT.VIDEO_ANTARA_MUKHADA]: 'Video Antara-Mukhada',
  [QUESTION_FORMAT.IMAGE_CLUE]: 'Image clue',
  [QUESTION_FORMAT.SIMPLE_ANTAKSHARI]: 'Simple Antakshari',
}

export function questionFormatLabel(formatId) {
  return FORMAT_LABELS[formatId] ?? formatId ?? '—'
}

export function questionTypeFromMainRoundType(mainType) {
  switch (mainType) {
    case MAIN_ROUND_TYPE.WORD:
    case MAIN_ROUND_TYPE.MULTI_WORD:
      return 'word'
    case MAIN_ROUND_TYPE.AUDIO:
      return 'audio'
    case MAIN_ROUND_TYPE.VIDEO:
      return 'video'
    case MAIN_ROUND_TYPE.IMAGE:
      return 'image'
    default:
      return 'text'
  }
}

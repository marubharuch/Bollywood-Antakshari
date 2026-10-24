import { MAIN_ROUND_TYPE, resolveMainRoundType } from '../rounds/mainRoundType.js'
import { QUESTION_FORMAT } from './questionFormatModel.js'
import { normalizeLibraryQuestion } from './questionLibraryModel.js'

/**
 * Whether a canonical library question may be assigned to a round (media type + format).
 * @param {object} round normalized round
 * @param {object} libraryQuestion normalized library question
 */
export function isLibraryQuestionCompatibleWithRound(round, libraryQuestion) {
  const q = normalizeLibraryQuestion(libraryQuestion)
  if (!q || !q.isActive) return false
  const mainType = resolveMainRoundType(round)
  const typeOk =
    (mainType === MAIN_ROUND_TYPE.WORD && q.questionType === 'word') ||
    (mainType === MAIN_ROUND_TYPE.MULTI_WORD && q.questionType === 'word') ||
    (mainType === MAIN_ROUND_TYPE.AUDIO && q.questionType === 'audio') ||
    (mainType === MAIN_ROUND_TYPE.VIDEO && q.questionType === 'video') ||
    (mainType === MAIN_ROUND_TYPE.IMAGE && q.questionType === 'image')
  if (!typeOk) return false

  const roundFormat = round.questionFormat
  if (!roundFormat || roundFormat === QUESTION_FORMAT.LEGACY_UNSPECIFIED) return true
  if (!q.questionFormat || q.questionFormat === QUESTION_FORMAT.LEGACY_UNSPECIFIED) return true
  return q.questionFormat === roundFormat
}

export function filterLibraryForRound(round, questionLibrary) {
  return (questionLibrary ?? [])
    .map((item) => normalizeLibraryQuestion(item))
    .filter((q) => q && isLibraryQuestionCompatibleWithRound(round, q))
}

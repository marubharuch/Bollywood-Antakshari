import { normalizeRound } from '../rounds/roundModel.js'
import { getQuestionBank, questionBankEntryToPlayId } from '../questionBank/questionBankModel.js'
import { mukhadaBankEntryToRoundQuestion } from '../questionBank/questionBankRound.js'
import { resolveQuestionBankId } from '../questionBank/questionBankRound.js'
import {
  inferQuestionFormatForRound,
  QUESTION_FORMAT,
} from './questionFormatModel.js'
import { libraryQuestionFromRoundQuestion, normalizeQuestionLibrary } from './questionLibraryModel.js'
import {
  normalizeAssignmentQuestionIds,
  normalizeRoundQuestions,
} from '../rounds/roundQuestionModel.js'

/**
 * Merge seed bank entries into the library map (one canonical row per play id).
 * @param {Map<string, object>} byId
 * @param {string} bankId
 * @param {object} templateRound optional round used for format metadata
 */
function mergeSeedBankIntoMap(byId, bankId, templateRound = null) {
  const round =
    templateRound ??
    normalizeRound({
      questionBankId: bankId,
      mainRoundType: 'word',
      questionFormat: QUESTION_FORMAT.WORD_IN_MUKHADA,
    })
  for (const entry of getQuestionBank(bankId)) {
    const rq = mukhadaBankEntryToRoundQuestion(entry)
    const canonical = libraryQuestionFromRoundQuestion(rq, {
      ...round,
      questionBankId: bankId,
      questionFormat: inferQuestionFormatForRound(round),
    })
    const prev = byId.get(canonical.id)
    byId.set(canonical.id, prev ? { ...prev, ...canonical, updatedAt: Date.now() } : canonical)
  }
}

/**
 * Lift embedded round questions and seed banks into `questionLibrary`, and attach
 * `assignmentQuestionIds` / `questionFormat` on each round (legacy `questions[]` preserved).
 * @param {object[]} roundLibrary
 * @param {object[]} existingQuestionLibrary
 */
export function migrateRoundLibraryToQuestionLibrary(roundLibrary, existingQuestionLibrary = []) {
  const byId = new Map(normalizeQuestionLibrary(existingQuestionLibrary).map((q) => [q.id, q]))
  const banksMerged = new Set()

  const nextRounds = (roundLibrary ?? []).map((raw) => {
    const round = normalizeRound(raw)
    const bankId = resolveQuestionBankId(round)
    if (bankId && !banksMerged.has(bankId)) {
      mergeSeedBankIntoMap(byId, bankId, round)
      banksMerged.add(bankId)
    }

    const questions = normalizeRoundQuestions(round.questions)
    for (const rq of questions) {
      const canonical = libraryQuestionFromRoundQuestion(rq, round)
      const prev = byId.get(canonical.id)
      byId.set(canonical.id, prev ? { ...prev, ...canonical } : canonical)
    }

    const questionFormat = inferQuestionFormatForRound(round)
    const assignmentQuestionIds = normalizeAssignmentQuestionIds(
      round.assignmentQuestionIds,
      round,
    )

    return normalizeRound({
      ...round,
      questionFormat,
      assignmentQuestionIds,
      questions,
    })
  })

  return {
    roundLibrary: nextRounds,
    questionLibrary: [...byId.values()],
    changed: true,
  }
}

/**
 * Idempotent game-state migration hook.
 * @param {object} state partial normalized state
 */
export function migrateGameStateQuestionLibrary(state) {
  const existing = normalizeQuestionLibrary(state.questionLibrary ?? [])
  const { roundLibrary, questionLibrary } = migrateRoundLibraryToQuestionLibrary(
    state.roundLibrary ?? [],
    existing,
  )

  const libraryChanged =
    questionLibrary.length !== existing.length ||
    JSON.stringify(questionLibrary.map((q) => q.id).sort()) !==
      JSON.stringify(existing.map((q) => q.id).sort())

  const roundsNeedFormat = (state.roundLibrary ?? []).some(
    (r) => !r?.questionFormat || !Array.isArray(r?.assignmentQuestionIds),
  )

  if (!libraryChanged && !roundsNeedFormat && existing.length > 0) {
    return state
  }

  return {
    ...state,
    roundLibrary,
    questionLibrary,
  }
}

/** @param {unknown} raw */
export function normalizeQuestionLibraryFromImport(raw) {
  if (!Array.isArray(raw)) return []
  return normalizeQuestionLibrary(raw)
}

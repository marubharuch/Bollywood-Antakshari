import { normalizeRoundQuestions, normalizeRoundQuestion } from '../rounds/roundQuestionModel.js'
import {
  libraryQuestionToRoundQuestion,
  normalizeLibraryQuestion,
  normalizeQuestionLibrary,
} from './questionLibraryModel.js'

export const RESOLVE_SOURCE = {
  ASSIGNMENTS: 'assignments',
  ALLOCATED: 'allocated',
  LEGACY_EMBEDDED: 'legacy_embedded',
  SYNTHETIC: 'synthetic',
  NONE: 'none',
}

/**
 * @typedef {object} ResolveRoundPlayQuestionsResult
 * @property {import('../rounds/roundQuestionModel.js').normalizeRoundQuestion[]} questions
 * @property {string[]} errors
 * @property {string} source
 * @property {boolean} usedLegacyFallback
 * @property {boolean} usedSyntheticFallback
 */

function findLegacyEmbeddedById(round, id) {
  const embedded = normalizeRoundQuestions(round?.questions ?? [])
  return embedded.find((q) => q.id === id) ?? null
}

function resolveIdsToRoundQuestions(ids, round, libraryById, { allowLegacyEmbedded }) {
  const errors = []
  const out = []
  const seen = new Set()
  for (const rawId of ids) {
    const id = typeof rawId === 'string' ? rawId.trim() : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    const canonical = libraryById.get(id)
    if (canonical) {
      out.push(libraryQuestionToRoundQuestion(canonical))
      continue
    }
    if (allowLegacyEmbedded) {
      const legacy = findLegacyEmbeddedById(round, id)
      if (legacy) {
        out.push(normalizeRoundQuestion(legacy))
        continue
      }
    }
    errors.push(`Question “${id}” is missing from the question library.`)
  }
  return { questions: out, errors }
}

/**
 * Resolve playable round questions (round-question shape) for queue building and validation.
 * Priority: assignmentQuestionIds → allocatedQuestionIds → legacy embedded.
 * @param {object} round
 * @param {object[]} questionLibrary
 * @param {{ allocatedQuestionIds?: string[], allowLegacyEmbedded?: boolean, allowSynthetic?: boolean }} [options]
 * @returns {ResolveRoundPlayQuestionsResult}
 */
export function resolveRoundPlayQuestions(round, questionLibrary, options = {}) {
  const libraryById = new Map(
    normalizeQuestionLibrary(questionLibrary).map((q) => [q.id, q]),
  )
  const allowLegacyEmbedded = options.allowLegacyEmbedded !== false
  const assignmentIds = Array.isArray(round?.assignmentQuestionIds)
    ? round.assignmentQuestionIds
        .filter((id) => typeof id === 'string' && id.trim())
        .map((id) => id.trim())
    : []

  let base = { questions: [], errors: [] }
  let source = RESOLVE_SOURCE.NONE

  if (assignmentIds.length > 0) {
    base = resolveIdsToRoundQuestions(assignmentIds, round, libraryById, {
      allowLegacyEmbedded,
    })
    if (base.errors.length === 0 && base.questions.length > 0) {
      source = RESOLVE_SOURCE.ASSIGNMENTS
    } else if (base.errors.length > 0) {
      return {
        questions: [],
        errors: base.errors,
        source: RESOLVE_SOURCE.ASSIGNMENTS,
        usedLegacyFallback: false,
        usedSyntheticFallback: false,
      }
    }
  }

  if (source === RESOLVE_SOURCE.NONE) {
    const allocated = options.allocatedQuestionIds
    if (Array.isArray(allocated) && allocated.length > 0) {
      base = resolveIdsToRoundQuestions(allocated, round, libraryById, {
        allowLegacyEmbedded,
      })
      if (base.errors.length > 0) {
        return {
          questions: [],
          errors: base.errors,
          source: RESOLVE_SOURCE.ALLOCATED,
          usedLegacyFallback: false,
          usedSyntheticFallback: false,
        }
      }
      if (base.questions.length > 0) {
        source = RESOLVE_SOURCE.ALLOCATED
      }
    }
  }

  let usedLegacyFallback = false
  if (source === RESOLVE_SOURCE.NONE) {
    const legacy = normalizeRoundQuestions(round?.questions ?? []).filter(
      (q) => q.selectedForRound !== false,
    )
    if (legacy.length > 0) {
      return {
        questions: legacy,
        errors: [],
        source: RESOLVE_SOURCE.LEGACY_EMBEDDED,
        usedLegacyFallback: true,
        usedSyntheticFallback: false,
      }
    }
  }

  if (source === RESOLVE_SOURCE.ASSIGNMENTS && options.allocatedQuestionIds?.length) {
    const byId = new Map(base.questions.map((q) => [q.id, q]))
    const filtered = []
    const allocErrors = []
    for (const id of options.allocatedQuestionIds) {
      const q = byId.get(id)
      if (q) filtered.push(q)
      else allocErrors.push(`Allocated question “${id}” is not in this round’s assignment pool.`)
    }
    if (allocErrors.length) {
      return {
        questions: [],
        errors: allocErrors,
        source: RESOLVE_SOURCE.ALLOCATED,
        usedLegacyFallback: false,
        usedSyntheticFallback: false,
      }
    }
    if (filtered.length > 0) {
      return {
        questions: filtered,
        errors: [],
        source: RESOLVE_SOURCE.ALLOCATED,
        usedLegacyFallback: false,
        usedSyntheticFallback: false,
      }
    }
  }

  if (base.questions.length > 0) {
    return {
      questions: base.questions,
      errors: [],
      source,
      usedLegacyFallback,
      usedSyntheticFallback: false,
    }
  }

  if (options.allowSynthetic) {
    const count = Math.max(0, round?.rules?.questionCount ?? 0)
    if (count > 0) {
      const synthetic = Array.from({ length: count }, (_, i) =>
        normalizeRoundQuestion({
          id: `q-synthetic-${i + 1}`,
          word: '',
          selectedForRound: true,
          sortOrder: i,
        }),
      )
      return {
        questions: synthetic,
        errors: [
          `Legacy synthetic placeholder: ${count} question slot(s) — configure the question library.`,
        ],
        source: RESOLVE_SOURCE.SYNTHETIC,
        usedLegacyFallback: false,
        usedSyntheticFallback: true,
      }
    }
  }

  return {
    questions: [],
    errors: [],
    source: RESOLVE_SOURCE.NONE,
    usedLegacyFallback: false,
    usedSyntheticFallback: false,
  }
}

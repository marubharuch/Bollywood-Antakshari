import { MAIN_ROUND_TYPE } from './mainRoundType.js'
import { normalizeRound } from './roundModel.js'
import { normalizeRoundQuestions } from './roundQuestionModel.js'
import { wordRoundKeyFromQuestion, wordRoundKeysForEntry } from './wordRoundKey.js'
import {
  hindiWordEntryToRoundQuestion,
  mergeHindiWordLibraryEntries,
} from './hindiWordLibraryMerge.js'
import { HINDI_WORD_LIBRARY_BATCH_1 } from './hindiWordLibraryBatch1.js'
import { HINDI_WORD_LIBRARY_BATCH_2 } from './hindiWordLibraryBatch2.js'

/** Stable round library id for the merged Hindi word round. */
export const HINDI_WORD_ROUND_LIBRARY_ID = 'round-hindi-word-library-40'

const DEFAULT_ROUND_META = {
  id: HINDI_WORD_ROUND_LIBRARY_ID,
  name: 'Hindi Word Round (40)',
  description: 'Name a Bollywood song containing the Hindi word shown on the projector.',
  instructions: 'Teams name a song where the target word appears (per round rules).',
  category: 'antakshari',
  mainRoundType: MAIN_ROUND_TYPE.WORD,
  customRule: '',
  scoring: { correctPoints: 10, wrongPenalty: 5, passPoints: 0 },
  timing: { useTimer: true, timeLimitSeconds: 30 },
  rules: {
    buzzerEnabled: false,
    mediaRequired: false,
    questionCount: 0,
    maxAttemptsPerTeam: 1,
  },
  active: true,
  isTemplate: false,
}

export function getHindiWordLibrarySourceEntries() {
  return [...HINDI_WORD_LIBRARY_BATCH_1, ...HINDI_WORD_LIBRARY_BATCH_2]
}

export function buildHindiWordLibraryMergeReport() {
  return mergeHindiWordLibraryEntries(getHindiWordLibrarySourceEntries())
}

/**
 * Upsert merged Hindi word questions into the round library without touching other rounds.
 * Preserves existing question ids when the normalized word key matches.
 * @param {object[]} roundLibrary
 */
export function applyHindiWordLibraryToRoundLibrary(roundLibrary) {
  const sources = getHindiWordLibrarySourceEntries()
  if (!sources.length) {
    return { roundLibrary, report: buildHindiWordLibraryMergeReport(), changed: false }
  }

  const merge = buildHindiWordLibraryMergeReport()
  const list = Array.isArray(roundLibrary) ? [...roundLibrary] : []
  const idx = list.findIndex((r) => r?.id === HINDI_WORD_ROUND_LIBRARY_ID)
  const existing = idx >= 0 ? normalizeRound(list[idx]) : null
  const existingQs = normalizeRoundQuestions(existing?.questions ?? [])

  /** @type {Map<string, string>} key -> question id */
  const idByKey = new Map()
  for (const q of existingQs) {
    const key = wordRoundKeyFromQuestion(q)
    if (key && q.id) idByKey.set(key, q.id)
  }

  const nextQuestions = merge.entries.map((entry, index) => {
    const keys = wordRoundKeysForEntry(entry)
    let stableId = (entry.id ?? '').trim()
    if (!stableId) {
      for (const k of keys) {
        if (idByKey.has(k)) {
          stableId = idByKey.get(k)
          break
        }
      }
    }
    const base = hindiWordEntryToRoundQuestion({ ...entry, id: stableId || entry.id }, index)
    const key = wordRoundKeyFromQuestion(base)
    const prior = key ? existingQs.find((q) => wordRoundKeyFromQuestion(q) === key) : null
    if (prior) {
      return {
        ...prior,
        ...base,
        id: prior.id,
        selectedForRound: prior.selectedForRound !== false,
      }
    }
    return base
  })

  const round = normalizeRound({
    ...DEFAULT_ROUND_META,
    ...(existing ?? {}),
    id: HINDI_WORD_ROUND_LIBRARY_ID,
    mainRoundType: MAIN_ROUND_TYPE.WORD,
    questions: nextQuestions,
    updatedAt: Date.now(),
  })

  if (idx >= 0) {
    list[idx] = round
  } else {
    list.push(round)
  }

  return { roundLibrary: list, report: merge, changed: true }
}

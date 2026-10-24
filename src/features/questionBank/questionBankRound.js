import { normalizeRound } from '../rounds/roundModel.js'
import { normalizeRoundQuestions } from '../rounds/roundQuestionModel.js'
import { wordRoundKeyFromQuestion } from '../rounds/wordRoundKey.js'
import {
  getQuestionBank,
  getQuestionBankEntry,
  normalizeQuestionBankRoundSelection,
  questionBankEntryToPlayId,
  QUESTION_BANK_PICK_MODE,
} from './questionBankModel.js'

export function roundUsesQuestionBank(round) {
  const r = normalizeRound(round)
  return Boolean(r.questionBankId)
}

export function resolveQuestionBankId(round) {
  const r = normalizeRound(round)
  return typeof r.questionBankId === 'string' && r.questionBankId.trim()
    ? r.questionBankId.trim()
    : null
}

/**
 * @param {import('./questionBankModel.js').getQuestionBank extends Function ? ReturnType<typeof getQuestionBank>[number] : object} entry
 */
export function mukhadaBankEntryToRoundQuestion(entry) {
  const oldSong = (entry.oldSong ?? '').trim()
  const newSong = (entry.newSong ?? '').trim()
  const anchorNotes = [
    'Word must appear in the mukhda (not as the first word).',
    oldSong ? `Old song (pre-2000): ${oldSong}` : '',
    newSong ? `New song (post-2020): ${newSong}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    id: questionBankEntryToPlayId(entry.id),
    word: entry.word ?? '',
    words: ['', '', ''],
    mediaId: null,
    anchorNotes,
    acceptedAnswer: [oldSong, newSong].filter(Boolean).join(' · '),
    clue: [oldSong, newSong].filter(Boolean).join(' / '),
    sortOrder: entry.id,
    segmentStartSeconds: null,
    segmentEndSeconds: null,
    videoStartMuted: false,
    selectedForRound: true,
  }
}

export function roundQuestionsFromQuestionBank(bankId) {
  const entries = getQuestionBank(bankId)
  return normalizeRoundQuestions(entries.map((e) => mukhadaBankEntryToRoundQuestion(e)))
}

export function libraryRoundWithQuestionBankQuestions(libRound) {
  const normalized = normalizeRound(libRound)
  const bankId = resolveQuestionBankId(normalized)
  if (!bankId) return normalized
  const fromBank = roundQuestionsFromQuestionBank(bankId)
  if (!fromBank.length) return normalized
  return normalizeRound({
    ...normalized,
    questions: fromBank,
  })
}

/**
 * Eligible playable questions for allocation / validation (bank-backed or library).
 */
/**
 * Merge question-bank entries into roundLibrary `questions[]` for display, persistence, and play.
 * Source data: e.g. `mukhadaWordBank32.js` via `getQuestionBank(bankId)`.
 * Dedupes by stable play id (`mqb-*`) and normalized word key; preserves admin `selectedForRound`.
 * @param {object[]} roundLibrary
 */
export function hydrateRoundLibraryQuestionBanks(roundLibrary) {
  const list = Array.isArray(roundLibrary) ? [...roundLibrary] : []
  let changed = false

  for (let i = 0; i < list.length; i += 1) {
    const round = normalizeRound(list[i])
    const bankId = resolveQuestionBankId(round)
    if (!bankId) continue

    const fromBank = roundQuestionsFromQuestionBank(bankId)
    if (!fromBank.length) continue

    const existingQs = normalizeRoundQuestions(round.questions)
    const byId = new Map(existingQs.map((q) => [q.id, q]))
    const byWordKey = new Map()
    for (const q of existingQs) {
      const key = wordRoundKeyFromQuestion(q)
      if (key) byWordKey.set(key, q)
    }

    const merged = []
    const seenIds = new Set()
    const seenWordKeys = new Set()

    for (const bankQ of fromBank) {
      const wordKey = wordRoundKeyFromQuestion(bankQ)
      const prior = byId.get(bankQ.id) ?? (wordKey ? byWordKey.get(wordKey) : null)
      const nextQ = prior
        ? {
            ...bankQ,
            id: prior.id || bankQ.id,
            selectedForRound: prior.selectedForRound !== false,
            anchorNotes:
              (prior.anchorNotes ?? '').trim().length > (bankQ.anchorNotes ?? '').trim().length
                ? prior.anchorNotes
                : bankQ.anchorNotes,
            acceptedAnswer:
              (prior.acceptedAnswer ?? '').trim().length > (bankQ.acceptedAnswer ?? '').trim().length
                ? prior.acceptedAnswer
                : bankQ.acceptedAnswer,
            clue: (prior.clue ?? '').trim() || bankQ.clue,
            sortOrder: bankQ.sortOrder,
            word: bankQ.word,
          }
        : bankQ

      if (seenIds.has(nextQ.id)) continue
      if (wordKey && seenWordKeys.has(wordKey)) continue
      seenIds.add(nextQ.id)
      if (wordKey) seenWordKeys.add(wordKey)
      merged.push(nextQ)
    }

    for (const q of existingQs) {
      if (seenIds.has(q.id)) continue
      const wordKey = wordRoundKeyFromQuestion(q)
      if (wordKey && seenWordKeys.has(wordKey)) continue
      merged.push(q)
      seenIds.add(q.id)
      if (wordKey) seenWordKeys.add(wordKey)
    }

    merged.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    const nextRound = normalizeRound({
      ...round,
      questions: merged,
      questionBankId: bankId,
      mainRoundType: round.mainRoundType,
    })

    const before = JSON.stringify(normalizeRoundQuestions(round.questions))
    const after = JSON.stringify(normalizeRoundQuestions(nextRound.questions))
    if (before !== after) {
      list[i] = nextRound
      changed = true
    }
  }

  return { roundLibrary: list, changed }
}

export function eligibleQuestionsForLibraryRound(round) {
  const withBank = libraryRoundWithQuestionBankQuestions(round)
  const qs = normalizeRoundQuestions(withBank.questions).filter(
    (q) => q.selectedForRound !== false,
  )
  return qs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

function shuffleIds(ids) {
  const copy = [...ids]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Resolve allocated question ids for a bank-backed round from admin session selection.
 * @param {object} libRound normalized library round
 * @param {object | null | undefined} selection
 * @param {number} fallbackCount from stage slot
 * @param {Set<string>} [excludeWordKeys] show-wide used keys
 */
export function resolveQuestionBankAllocationIds(
  libRound,
  selection,
  fallbackCount,
  excludeWordKeys = null,
) {
  const bankId = resolveQuestionBankId(libRound)
  if (!bankId) return []
  const bankRound = libraryRoundWithQuestionBankQuestions(libRound)
  const allQs = eligibleQuestionsForLibraryRound(bankRound)
  const allIds = allQs.map((q) => q.id)
  const byId = new Map(allQs.map((q) => [q.id, q]))

  const normalizedSel = normalizeQuestionBankRoundSelection(
    { ...selection, bankId },
    bankId,
  )
  const want = Math.min(
    normalizedSel.useCount || fallbackCount || allIds.length,
    allIds.length,
  )

  const filterUnused = (ids) =>
    ids.filter((id) => {
      if (!excludeWordKeys) return true
      const key = wordRoundKeyFromQuestion(byId.get(id))
      return !key || !excludeWordKeys.has(key)
    })

  if (
    normalizedSel.pickMode === QUESTION_BANK_PICK_MODE.MANUAL &&
    normalizedSel.entryIds.length >= want
  ) {
    const manualIds = normalizedSel.entryIds
      .slice(0, want)
      .map((n) => questionBankEntryToPlayId(n))
      .filter((id) => byId.has(id))
    const picked = filterUnused(manualIds)
    if (picked.length >= want) return picked.slice(0, want)
  }

  const pool = filterUnused(allIds)
  return shuffleIds(pool).slice(0, want)
}

export function getBankEntryForPlayQuestion(bankId, playQuestionId) {
  const entryId = parseInt(String(playQuestionId).replace(/^mqb-/, ''), 10)
  if (!Number.isFinite(entryId)) return null
  return getQuestionBankEntry(bankId, entryId)
}

import { QUESTION_BANK_ID } from './questionBankIds.js'
import { MUKHADA_WORD_BANK_32 } from './mukhadaWordBank32.js'

const BANKS = {
  [QUESTION_BANK_ID.MUKHADA_WORD_32]: MUKHADA_WORD_BANK_32,
}

export function getQuestionBank(bankId) {
  if (!bankId) return []
  return BANKS[bankId] ?? []
}

export function questionBankEntryCount(bankId) {
  return getQuestionBank(bankId).length
}

export function getQuestionBankEntry(bankId, entryId) {
  const id = Number(entryId)
  return getQuestionBank(bankId).find((e) => e.id === id) ?? null
}

export function questionBankEntryToPlayId(entryId) {
  return `mqb-${entryId}`
}

export function parseQuestionBankEntryId(playId) {
  if (typeof playId !== 'string' || !playId.startsWith('mqb-')) return null
  const n = Number(playId.slice(4))
  return Number.isFinite(n) ? n : null
}

export const QUESTION_BANK_PICK_MODE = {
  RANDOM: 'random',
  MANUAL: 'manual',
}

export function normalizeQuestionBankRoundSelection(raw, bankId) {
  const bankSize = questionBankEntryCount(bankId)
  const base = {
    bankId,
    useCount: bankSize > 0 ? Math.min(10, bankSize) : 0,
    pickMode: QUESTION_BANK_PICK_MODE.RANDOM,
    entryIds: [],
  }
  if (!raw || typeof raw !== 'object') return base

  let useCount = Number(raw.useCount)
  if (!Number.isFinite(useCount) || useCount < 1) useCount = base.useCount
  useCount = Math.min(bankSize || useCount, Math.max(1, Math.floor(useCount)))

  const pickMode =
    raw.pickMode === QUESTION_BANK_PICK_MODE.MANUAL
      ? QUESTION_BANK_PICK_MODE.MANUAL
      : QUESTION_BANK_PICK_MODE.RANDOM

  const entryIds = Array.isArray(raw.entryIds)
    ? raw.entryIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id >= 1)
    : []

  const validIds = new Set(getQuestionBank(bankId).map((e) => e.id))
  const filtered = entryIds.filter((id) => validIds.has(id))

  return {
    bankId,
    useCount,
    pickMode,
    entryIds: pickMode === QUESTION_BANK_PICK_MODE.MANUAL ? filtered.slice(0, useCount) : filtered,
  }
}

export function normalizeQuestionBankSelections(raw) {
  if (!raw || typeof raw !== 'object') return {}
  /** @type {Record<string, ReturnType<typeof normalizeQuestionBankRoundSelection>>} */
  const out = {}
  for (const [libraryRoundId, sel] of Object.entries(raw)) {
    if (!libraryRoundId || typeof libraryRoundId !== 'string') continue
    const bankId =
      typeof sel?.bankId === 'string' && sel.bankId.trim() ? sel.bankId.trim() : null
    if (!bankId) continue
    out[libraryRoundId] = normalizeQuestionBankRoundSelection(sel, bankId)
  }
  return out
}

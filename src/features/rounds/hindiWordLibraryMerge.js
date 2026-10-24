import { normalizeWordRoundKey, wordRoundKeysForEntry } from './wordRoundKey.js'
import { createRoundQuestionId } from './roundQuestionModel.js'

/**
 * @typedef {object} HindiWordLibraryEntry
 * @property {string} [id] stable rq-* id
 * @property {string} word target word on projector
 * @property {string} [acceptedAnswer]
 * @property {string} [anchorNotes]
 * @property {string} [clue] song reference line (title / year)
 * @property {string} [songTitle]
 * @property {number|string} [songYear]
 * @property {string[]} [aliases] extra spellings for dedupe only
 * @property {number} [sortOrder]
 */

function entryQualityScore(entry) {
  let score = 0
  const notes = (entry.anchorNotes ?? '').trim()
  const clue = (entry.clue ?? '').trim()
  const answer = (entry.acceptedAnswer ?? '').trim()
  const title = (entry.songTitle ?? '').trim()
  const year = entry.songYear
  score += notes.length
  score += clue.length * 2
  score += answer.length
  score += title.length * 2
  if (year !== undefined && year !== null && String(year).trim() !== '') score += 20
  if ((entry.id ?? '').trim()) score += 5
  return score
}

function buildClue(entry) {
  const explicit = (entry.clue ?? '').trim()
  if (explicit) return explicit
  const title = (entry.songTitle ?? '').trim()
  const year = entry.songYear
  const yearStr = year !== undefined && year !== null && String(year).trim() !== '' ? String(year).trim() : ''
  if (title && yearStr) return `${title} (${yearStr})`
  if (title) return title
  return ''
}

function pickBetterEntry(current, candidate) {
  if (!current) return candidate
  const a = entryQualityScore(current)
  const b = entryQualityScore(candidate)
  if (b > a) return candidate
  if (b < a) return current
  const idA = (current.id ?? '').trim()
  const idB = (candidate.id ?? '').trim()
  if (idA && !idB) return current
  if (idB && !idA) return candidate
  return current
}

/**
 * @param {HindiWordLibraryEntry[]} batches flat list (e.g. batch1 + batch2)
 */
export function mergeHindiWordLibraryEntries(batches) {
  const input = Array.isArray(batches) ? batches.filter(Boolean) : []
  const originalEntryCount = input.length

  /** @type {Map<string, HindiWordLibraryEntry>} */
  const byKey = new Map()
  /** @type {HindiWordLibraryEntry[]} */
  const mergedDuplicates = []

  for (const entry of input) {
    const keys = wordRoundKeysForEntry(entry)
    const primaryKey = [...keys][0] || normalizeWordRoundKey(entry.word)
    if (!primaryKey) continue

    let existingKey = null
    for (const k of keys) {
      if (byKey.has(k)) {
        existingKey = k
        break
      }
    }
    if (!existingKey) {
      for (const [storedKey, stored] of byKey.entries()) {
        const storedKeys = wordRoundKeysForEntry(stored)
        if (keys.some((k) => storedKeys.has(k))) {
          existingKey = storedKey
          break
        }
      }
    }

    if (!existingKey) {
      byKey.set(primaryKey, { ...entry })
      continue
    }

    const merged = pickBetterEntry(byKey.get(existingKey), entry)
    mergedDuplicates.push({
      removed: entry,
      kept: merged,
      key: existingKey,
    })
    byKey.set(existingKey, merged)
  }

  const entries = [...byKey.values()].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.word ?? '').localeCompare(b.word ?? ''),
  )

  return {
    originalEntryCount,
    duplicateEntriesMerged: mergedDuplicates.length,
    mergedDuplicates,
    finalUniqueCount: entries.length,
    entries,
  }
}

/**
 * @param {HindiWordLibraryEntry} entry
 * @param {number} index
 */
export function hindiWordEntryToRoundQuestion(entry, index = 0) {
  const clue = buildClue(entry)
  return {
    id: (entry.id ?? '').trim() || createRoundQuestionId(),
    word: typeof entry.word === 'string' ? entry.word : '',
    words: ['', '', ''],
    mediaId: null,
    anchorNotes: typeof entry.anchorNotes === 'string' ? entry.anchorNotes : '',
    acceptedAnswer: typeof entry.acceptedAnswer === 'string' ? entry.acceptedAnswer : '',
    clue,
    sortOrder: typeof entry.sortOrder === 'number' ? entry.sortOrder : index,
    segmentStartSeconds: null,
    segmentEndSeconds: null,
    videoStartMuted: false,
    selectedForRound: entry.selectedForRound !== false,
  }
}

/**
 * Stable key for deduping Hindi word-round targets across spellings / light transliteration variants.
 * @param {string} raw
 */
export function normalizeWordRoundKey(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return ''

  if (/[\u0900-\u097F]/.test(text)) {
    return text.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()
  }

  let s = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  s = s.replace(/[''`]/g, '')
  s = s.replace(/[^a-z0-9\u0900-\u097F]+/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  s = collapseRomanVowelDoubles(s)
  return s
}

function collapseRomanVowelDoubles(s) {
  return s
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/ii/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/uu/g, 'u')
}

/**
 * @param {object | null | undefined} question
 */
export function wordRoundKeyFromQuestion(question) {
  if (!question || typeof question !== 'object') return ''
  const word = typeof question.word === 'string' ? question.word : ''
  const primary = normalizeWordRoundKey(word)
  if (primary) return primary
  const accepted =
    typeof question.acceptedAnswer === 'string' ? normalizeWordRoundKey(question.acceptedAnswer) : ''
  return accepted
}

/**
 * @param {object} entry library merge entry
 */
export function wordRoundKeyFromEntry(entry) {
  if (!entry || typeof entry !== 'object') return ''
  const keys = new Set()
  const word = normalizeWordRoundKey(entry.word)
  if (word) keys.add(word)
  if (Array.isArray(entry.aliases)) {
    for (const a of entry.aliases) {
      const k = normalizeWordRoundKey(a)
      if (k) keys.add(k)
    }
  }
  return word || [...keys][0] || ''
}

export function wordRoundKeysForEntry(entry) {
  const keys = new Set()
  const primary = wordRoundKeyFromEntry(entry)
  if (primary) keys.add(primary)
  if (Array.isArray(entry?.aliases)) {
    for (const a of entry.aliases) {
      const k = normalizeWordRoundKey(a)
      if (k) keys.add(k)
    }
  }
  return keys
}

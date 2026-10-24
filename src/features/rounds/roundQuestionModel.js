import { MAIN_ROUND_TYPE, resolveMainRoundType } from './mainRoundType.js'

export function createRoundQuestionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `rq-${crypto.randomUUID()}`
  }
  return `rq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * @param {unknown} raw
 */
export function normalizeRoundQuestion(raw, index = 0) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: createRoundQuestionId(),
      word: '',
      words: ['', '', ''],
      mediaId: null,
      anchorNotes: '',
      acceptedAnswer: '',
      clue: '',
      sortOrder: index,
      segmentStartSeconds: null,
      segmentEndSeconds: null,
      videoStartMuted: false,
      selectedForRound: true,
    }
  }
  const words = Array.isArray(raw.words)
    ? raw.words.slice(0, 3).map((w) => (typeof w === 'string' ? w : ''))
    : ['', '', '']
  while (words.length < 3) words.push('')

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createRoundQuestionId(),
    word: typeof raw.word === 'string' ? raw.word : '',
    words,
    mediaId: typeof raw.mediaId === 'string' ? raw.mediaId : null,
    anchorNotes: typeof raw.anchorNotes === 'string' ? raw.anchorNotes : '',
    acceptedAnswer: typeof raw.acceptedAnswer === 'string' ? raw.acceptedAnswer : '',
    clue: typeof raw.clue === 'string' ? raw.clue : '',
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : index,
    segmentStartSeconds: normalizeSegmentTime(raw.segmentStartSeconds),
    segmentEndSeconds: normalizeSegmentTime(raw.segmentEndSeconds),
    videoStartMuted: Boolean(raw.videoStartMuted),
    selectedForRound: raw.selectedForRound !== false,
  }
}

function normalizeSegmentTime(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/**
 * @param {object} q normalized question
 * @param {number} [mediaDuration]
 */
export function validateQuestionMediaSegment(q, mediaDuration) {
  const errors = []
  const start = q.segmentStartSeconds
  const end = q.segmentEndSeconds
  if (start === null && end === null) return { valid: true, errors }
  if (start === null || end === null) {
    errors.push('Set both start and end times from playback, or leave both unset for full clip.')
    return { valid: false, errors }
  }
  if (end <= start) {
    errors.push('End time must be after start time.')
  }
  if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
    if (start > mediaDuration) errors.push('Start time exceeds media duration.')
    if (end > mediaDuration) errors.push('End time exceeds media duration.')
  }
  return { valid: errors.length === 0, errors }
}

export function normalizeRoundQuestions(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList.map((q, i) => normalizeRoundQuestion(q, i))
}

export function createEmptyQuestionForMainType(mainType) {
  const base = normalizeRoundQuestion(null)
  if (mainType === 'multi_word') {
    return { ...base, words: ['', '', ''] }
  }
  return base
}

export function countSelectedQuestions(questions) {
  if (!Array.isArray(questions)) return 0
  return questions.filter((q) => normalizeRoundQuestion(q).selectedForRound !== false).length
}

export function getSelectedRoundQuestions(questions) {
  if (!Array.isArray(questions)) return []
  return normalizeRoundQuestions(questions)
    .filter((q) => q.selectedForRound !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

/**
 * Playable question count for a round snapshot (matches buildQuestionQueue).
 * @param {object | null | undefined} round
 */
export function playableQuestionCountFromRound(round) {
  const mainType = resolveMainRoundType(round)
  if (mainType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) return 0
  const selected = getSelectedRoundQuestions(round?.questions).length
  if (selected > 0) return selected
  const fallback = Number(round?.rules?.questionCount)
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0
}

/**
 * Parenthetical selected-question label for tournament plan rows, e.g. "(6)" or "(0 questions)".
 * Uses only `selectedForRound` questions on this round snapshot — not library totals.
 * @param {object | null | undefined} round
 */
export function plannedRoundQuestionListLabel(round) {
  const mainType = resolveMainRoundType(round)
  if (mainType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    return '(No questions required)'
  }
  const count = getSelectedRoundQuestions(round?.questions).length
  if (count === 0) return '(0 questions)'
  if (count === 1) return '(1 question)'
  return `(${count} questions)`
}

/**
 * @param {object} q normalized question
 * @param {string} mainType
 * @param {{ displayTitle?: string, originalFileName?: string } | null} [mediaItem]
 */
export function questionSummaryLabel(q, mainType, mediaItem = null) {
  const nq = normalizeRoundQuestion(q)
  if (mainType === MAIN_ROUND_TYPE.WORD) {
    const w = (nq.word ?? '').trim()
    return w || '— (no word yet)'
  }
  if (mainType === MAIN_ROUND_TYPE.MULTI_WORD) {
    const parts = (nq.words ?? []).map((w) => (w ?? '').trim()).filter(Boolean)
    return parts.length ? parts.join(' · ') : '— (no words yet)'
  }
  if (
    mainType === MAIN_ROUND_TYPE.AUDIO ||
    mainType === MAIN_ROUND_TYPE.VIDEO ||
    mainType === MAIN_ROUND_TYPE.IMAGE
  ) {
    const title = mediaItem?.displayTitle || mediaItem?.originalFileName
    return title || (nq.mediaId ? 'Media selected' : '— (no media)')
  }
  return 'Question'
}

/**
 * @param {object} q
 * @param {string} mainType
 * @param {string} [label]
 */
export function validateRoundQuestion(q, mainType, label = 'Question') {
  const errors = {}
  const nq = normalizeRoundQuestion(q)

  if (mainType === MAIN_ROUND_TYPE.WORD && !(nq.word ?? '').trim()) {
    errors.word = `${label}: word or phrase is required.`
  }
  if (mainType === MAIN_ROUND_TYPE.MULTI_WORD) {
    const filled = (nq.words ?? []).filter((w) => (w ?? '').trim()).length
    if (filled < 1) {
      errors.words = `${label}: add at least one word.`
    }
  }
  if (
    (mainType === MAIN_ROUND_TYPE.AUDIO ||
      mainType === MAIN_ROUND_TYPE.VIDEO ||
      mainType === MAIN_ROUND_TYPE.IMAGE) &&
    !nq.mediaId
  ) {
    errors.media = `${label}: choose a media asset.`
  }
  if (
    (mainType === MAIN_ROUND_TYPE.AUDIO || mainType === MAIN_ROUND_TYPE.VIDEO) &&
    nq.mediaId
  ) {
    if (nq.segmentStartSeconds == null || nq.segmentEndSeconds == null) {
      errors.segment = `${label}: set start and end times from playback.`
    } else {
      const seg = validateQuestionMediaSegment(nq, 0)
      if (!seg.valid) {
        errors.segment = `${label}: ${seg.errors[0]}`
      }
    }
  }

  const keys = Object.keys(errors)
  return {
    valid: keys.length === 0,
    errors,
    firstError: keys.length ? errors[keys[0]] : null,
  }
}

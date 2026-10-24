import { resolveMainRoundType } from '../rounds/mainRoundType.js'
import { normalizeRoundQuestion } from '../rounds/roundQuestionModel.js'
import {
  inferQuestionFormatForRound,
  questionTypeFromMainRoundType,
  normalizeQuestionFormat,
  QUESTION_FORMAT,
} from './questionFormatModel.js'
import { parseQuestionBankEntryId } from '../questionBank/questionBankModel.js'

export function createLibraryQuestionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `ql-${crypto.randomUUID()}`
  }
  return `ql-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function splitAcceptedAnswers(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return []
  return text
    .split(/\s*·\s*|\s*\/\s*|\s*;\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * @param {unknown} raw
 */
export function normalizeLibraryQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id =
    typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createLibraryQuestionId()
  const questionFormat =
    normalizeQuestionFormat(raw.questionFormat) ?? QUESTION_FORMAT.LEGACY_UNSPECIFIED
  const questionType =
    typeof raw.questionType === 'string' && raw.questionType.trim()
      ? raw.questionType.trim()
      : 'text'

  const mediaRaw = raw.media && typeof raw.media === 'object' ? raw.media : raw
  const mediaId =
    typeof mediaRaw.mediaId === 'string' && mediaRaw.mediaId.trim()
      ? mediaRaw.mediaId.trim()
      : null

  const payload = raw.typePayload && typeof raw.typePayload === 'object' ? raw.typePayload : {}

  const now = Date.now()
  return {
    id,
    questionType,
    questionFormat,
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    questionText: typeof raw.questionText === 'string' ? raw.questionText.trim() : '',
    instructions:
      typeof raw.instructions === 'string'
        ? raw.instructions
        : typeof raw.anchorNotes === 'string'
          ? raw.anchorNotes
          : '',
    answer:
      typeof raw.answer === 'string'
        ? raw.answer
        : typeof raw.acceptedAnswer === 'string'
          ? raw.acceptedAnswer
          : '',
    acceptedAnswers: Array.isArray(raw.acceptedAnswers)
      ? raw.acceptedAnswers.filter((a) => typeof a === 'string')
      : splitAcceptedAnswers(raw.acceptedAnswer ?? raw.answer),
    category: typeof raw.category === 'string' ? raw.category.trim() : '',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === 'string') : [],
    difficulty:
      typeof raw.difficulty === 'number' && Number.isFinite(raw.difficulty)
        ? raw.difficulty
        : null,
    language: typeof raw.language === 'string' ? raw.language.trim() : '',
    defaultPoints:
      typeof raw.defaultPoints === 'number' && Number.isFinite(raw.defaultPoints)
        ? raw.defaultPoints
        : null,
    media: mediaId
      ? {
          mediaId,
          segmentStartSeconds:
            mediaRaw.segmentStartSeconds ?? raw.segmentStartSeconds ?? null,
          segmentEndSeconds: mediaRaw.segmentEndSeconds ?? raw.segmentEndSeconds ?? null,
          videoStartMuted: Boolean(mediaRaw.videoStartMuted ?? raw.videoStartMuted),
        }
      : null,
    typePayload: {
      word: typeof payload.word === 'string' ? payload.word : typeof raw.word === 'string' ? raw.word : '',
      words: Array.isArray(payload.words)
        ? payload.words
        : Array.isArray(raw.words)
          ? raw.words
          : ['', '', ''],
      clue: typeof payload.clue === 'string' ? payload.clue : typeof raw.clue === 'string' ? raw.clue : '',
    },
    isActive: raw.isActive !== false,
    sourceRoundId:
      typeof raw.sourceRoundId === 'string' && raw.sourceRoundId.trim()
        ? raw.sourceRoundId.trim()
        : null,
    sourceBankId:
      typeof raw.sourceBankId === 'string' && raw.sourceBankId.trim()
        ? raw.sourceBankId.trim()
        : null,
    sourceBankEntryId:
      typeof raw.sourceBankEntryId === 'number' && Number.isFinite(raw.sourceBankEntryId)
        ? raw.sourceBankEntryId
        : null,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  }
}

export function normalizeQuestionLibrary(raw) {
  if (!Array.isArray(raw)) return []
  const byId = new Map()
  for (const item of raw) {
    const q = normalizeLibraryQuestion(item)
    if (!q) continue
    const prev = byId.get(q.id)
    if (!prev) {
      byId.set(q.id, q)
      continue
    }
    byId.set(q.id, mergeLibraryQuestions(prev, q))
  }
  return [...byId.values()]
}

function mergeLibraryQuestions(a, b) {
  const pick = (field) => {
    const av = a[field]
    const bv = b[field]
    if (typeof av === 'string' && av.trim().length > (bv ?? '').trim().length) return av
    return bv ?? av
  }
  return normalizeLibraryQuestion({
    ...a,
    ...b,
    title: pick('title'),
    questionText: pick('questionText'),
    instructions: pick('instructions'),
    answer: pick('answer'),
    acceptedAnswers: a.acceptedAnswers?.length ? a.acceptedAnswers : b.acceptedAnswers,
    typePayload: { ...a.typePayload, ...b.typePayload },
    updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0),
  })
}

/**
 * Lift one embedded round question into the canonical library shape.
 * @param {object} rq normalized round question
 * @param {object} round normalized round definition
 */
/** Canonical library row → embedded round-question shape for play / legacy APIs. */
export function libraryQuestionToRoundQuestion(lq) {
  const q = normalizeLibraryQuestion(lq)
  if (!q) return normalizeRoundQuestion(null)
  return normalizeRoundQuestion({
    id: q.id,
    word: q.typePayload?.word ?? '',
    words: q.typePayload?.words ?? ['', '', ''],
    clue: q.typePayload?.clue || q.questionText || '',
    mediaId: q.media?.mediaId ?? null,
    segmentStartSeconds: q.media?.segmentStartSeconds ?? null,
    segmentEndSeconds: q.media?.segmentEndSeconds ?? null,
    videoStartMuted: Boolean(q.media?.videoStartMuted),
    anchorNotes: q.instructions ?? '',
    acceptedAnswer:
      q.answer ||
      (q.acceptedAnswers?.length ? q.acceptedAnswers.join(' · ') : ''),
    selectedForRound: true,
    sortOrder: 0,
  })
}

export function libraryQuestionFromRoundQuestion(rq, round) {
  const nq = normalizeRoundQuestion(rq)
  const mainType = resolveMainRoundType(round)
  const questionFormat = inferQuestionFormatForRound(round)
  const bankEntryId = parseQuestionBankEntryId(nq.id)

  const word = (nq.word ?? '').trim()
  const title =
    word ||
    (nq.words ?? []).map((w) => (w ?? '').trim()).filter(Boolean).join(' · ') ||
    (nq.clue ?? '').trim() ||
    nq.id

  return normalizeLibraryQuestion({
    id: nq.id,
    questionType: questionTypeFromMainRoundType(mainType),
    questionFormat,
    title,
    questionText: (nq.clue ?? '').trim(),
    instructions: nq.anchorNotes ?? '',
    answer: nq.acceptedAnswer ?? '',
    acceptedAnswers: splitAcceptedAnswers(nq.acceptedAnswer),
    media: nq.mediaId
      ? {
          mediaId: nq.mediaId,
          segmentStartSeconds: nq.segmentStartSeconds,
          segmentEndSeconds: nq.segmentEndSeconds,
          videoStartMuted: nq.videoStartMuted,
        }
      : null,
    typePayload: {
      word: nq.word,
      words: nq.words,
      clue: nq.clue,
    },
    isActive: nq.selectedForRound !== false,
    sourceRoundId: round?.id ?? null,
    sourceBankId: round?.questionBankId ?? null,
    sourceBankEntryId: bankEntryId,
    createdAt: round?.createdAt,
    updatedAt: round?.updatedAt,
  })
}

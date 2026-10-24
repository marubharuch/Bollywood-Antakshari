/**
 * Phase 2 regression tests (node scripts/test-phase2.mjs)
 */
import assert from 'node:assert/strict'
import { normalizeRound } from '../src/features/rounds/roundModel.js'
import { buildQuestionQueue } from '../src/features/tournament/tournamentModel.js'
import {
  resolveRoundPlayQuestions,
  RESOLVE_SOURCE,
} from '../src/features/questionLibrary/resolveRoundPlayQuestions.js'
import {
  libraryQuestionToRoundQuestion,
  normalizeLibraryQuestion,
} from '../src/features/questionLibrary/questionLibraryModel.js'
import { filterLibraryForRound } from '../src/features/questionLibrary/libraryQuestionCompat.js'
import { QUESTION_FORMAT } from '../src/features/questionLibrary/questionFormatModel.js'
import { MAIN_ROUND_TYPE } from '../src/features/rounds/mainRoundType.js'

const lib = [
  normalizeLibraryQuestion({
    id: 'ql-word-1',
    questionType: 'word',
    questionFormat: QUESTION_FORMAT.WORD_SINGLE,
    title: 'Namaste',
    typePayload: { word: 'Namaste' },
    answer: 'Song A',
  }),
  normalizeLibraryQuestion({
    id: 'ql-audio-1',
    questionType: 'audio',
    questionFormat: QUESTION_FORMAT.LEGACY_UNSPECIFIED,
    title: 'Clip 1',
    media: { mediaId: 'media-1', segmentStartSeconds: 0, segmentEndSeconds: 10 },
    answer: 'Tune X',
  }),
]

const wordRound = normalizeRound({
  id: 'r-word',
  name: 'Word Round',
  mainRoundType: MAIN_ROUND_TYPE.WORD,
  questionFormat: QUESTION_FORMAT.WORD_SINGLE,
  assignmentQuestionIds: ['ql-word-1'],
  questions: [],
})

const resolved = resolveRoundPlayQuestions(wordRound, lib, {})
assert.equal(resolved.source, RESOLVE_SOURCE.ASSIGNMENTS)
assert.equal(resolved.questions[0].word, 'Namaste')

const missing = resolveRoundPlayQuestions(
  { ...wordRound, assignmentQuestionIds: ['missing-id'] },
  lib,
  {},
)
assert.ok(missing.errors.length > 0)
assert.equal(missing.questions.length, 0)

const legacyRound = normalizeRound({
  id: 'r-leg',
  name: 'Legacy',
  mainRoundType: MAIN_ROUND_TYPE.WORD,
  questions: [
    {
      id: 'rq-legacy',
      word: 'LegacyWord',
      selectedForRound: true,
      sortOrder: 0,
    },
  ],
  assignmentQuestionIds: [],
})
const legacy = resolveRoundPlayQuestions(legacyRound, lib, {})
assert.equal(legacy.source, RESOLVE_SOURCE.LEGACY_EMBEDDED)
assert.equal(legacy.usedLegacyFallback, true)

const queue = buildQuestionQueue(wordRound, false, { questionLibrary: lib })
assert.equal(queue.questions.length, 1)
assert.ok(queue.questions[0].prompt.includes('Namaste'))
assert.equal(queue.resolveMeta?.source, RESOLVE_SOURCE.ASSIGNMENTS)

const allocRound = normalizeRound({
  ...wordRound,
  assignmentQuestionIds: ['ql-word-1', 'ql-word-2'],
})
const lib2 = [...lib, normalizeLibraryQuestion({ id: 'ql-word-2', questionType: 'word', title: 'B', typePayload: { word: 'B' } })]
const alloc = buildQuestionQueue(allocRound, false, {
  questionLibrary: lib2,
  allocatedQuestionIds: ['ql-word-2'],
})
assert.equal(alloc.questions.length, 1)
assert.equal(alloc.questions[0].libraryQuestionId, 'ql-word-2')

const noSynth = buildQuestionQueue(
  normalizeRound({ id: 'empty', name: 'E', mainRoundType: MAIN_ROUND_TYPE.WORD, questions: [] }),
  false,
  { questionLibrary: [], allowSynthetic: false },
)
assert.equal(noSynth.questions.length, 0)

const filtered = filterLibraryForRound(wordRound, lib)
assert.equal(filtered.length, 1)
assert.equal(filtered[0].id, 'ql-word-1')

const rq = libraryQuestionToRoundQuestion(lib[1])
assert.equal(rq.mediaId, 'media-1')
assert.equal(rq.segmentEndSeconds, 10)

console.log('phase 2 tests passed')

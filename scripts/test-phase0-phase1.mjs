/**
 * Phase 0 + Phase 1 regression tests (node scripts/test-phase0-phase1.mjs)
 */
import assert from 'node:assert/strict'
import {
  instanceHasProtectedExecutionData,
  shouldSyncPlannedRoundsFromStage,
} from '../src/features/tournament/instanceExecutionGuard.js'
import { syncTournamentInstancesFromStageProfiles } from '../src/features/tournament/syncInstancesFromStageProfiles.js'
import { TOURNAMENT_STATUS } from '../src/features/tournament/tournamentLifecycle.js'
import { ROUND_PLAY_STATUS, QUESTION_STATUS } from '../src/features/tournament/tournamentModel.js'
import { createEmptyTournamentInstanceBundle } from '../src/features/tournament/tournamentInstanceModel.js'
import { migrateRoundLibraryToQuestionLibrary } from '../src/features/questionLibrary/migrateQuestionLibrary.js'
import { QUESTION_FORMAT } from '../src/features/questionLibrary/questionFormatModel.js'
import { normalizeRound } from '../src/features/rounds/roundModel.js'
import { validateTournamentImportPackage } from '../src/features/migration/tournamentImportModel.js'
import { TOURNAMENT_EXPORT_FORMAT, TOURNAMENT_EXPORT_VERSION } from '../src/features/migration/tournamentExportModel.js'
import { resolveBankRoundAllocationIds } from '../src/features/tournament/instanceQuestionAllocation.js'
import { QUESTION_BANK_ID } from '../src/features/questionBank/questionBankIds.js'
import { normalizeGameState } from '../src/state/initialGameState.js'

// --- Phase 0: execution guard ---
const readyWithScores = createEmptyTournamentInstanceBundle('ti-semi-final-1')
readyWithScores.tournament.status = TOURNAMENT_STATUS.READY
readyWithScores.teams = [
  { id: 't1', name: 'A', score: 10, accent: '#f00' },
  { id: 't2', name: 'B', score: 0, accent: '#0f0' },
]
readyWithScores.tournament.plannedRounds = [
  {
    id: 'plan-1',
    libraryRoundId: 'round-word-in-mukhada',
    snapshot: normalizeRound({ id: 'round-word-in-mukhada', name: 'Word', mainRoundType: 'word' }),
    roundStatus: ROUND_PLAY_STATUS.PENDING,
    questionProgress: {},
    teamRoundScores: {},
    allocatedQuestionIds: ['mqb-1', 'mqb-2'],
  },
]

assert.equal(instanceHasProtectedExecutionData(readyWithScores), true)
assert.equal(shouldSyncPlannedRoundsFromStage(readyWithScores, { forceReplan: true }), false)

const draftWithProgress = createEmptyTournamentInstanceBundle('ti-quarter-final-1')
draftWithProgress.tournament.status = TOURNAMENT_STATUS.DRAFT
draftWithProgress.tournament.plannedRounds = [
  {
    id: 'plan-x',
    libraryRoundId: 'r1',
    snapshot: normalizeRound({ id: 'r1', name: 'R', mainRoundType: 'word', questions: [] }),
    roundStatus: ROUND_PLAY_STATUS.PENDING,
    questionProgress: {
      questions: [{ id: 'q1', status: QUESTION_STATUS.COMPLETED }],
    },
    teamRoundScores: {},
    allocatedQuestionIds: [],
  },
]
assert.equal(instanceHasProtectedExecutionData(draftWithProgress), true)

const inProgress = createEmptyTournamentInstanceBundle('ti-grand-finale')
inProgress.tournament.status = TOURNAMENT_STATUS.IN_PROGRESS
assert.equal(shouldSyncPlannedRoundsFromStage(inProgress, { forceReplan: true }), false)

const emptyDraft = createEmptyTournamentInstanceBundle('ti-quarter-final-2')
emptyDraft.tournament.status = TOURNAMENT_STATUS.DRAFT
assert.equal(shouldSyncPlannedRoundsFromStage(emptyDraft, { forceReplan: true }), true)

const completed = createEmptyTournamentInstanceBundle('ti-semi-final-2')
completed.tournament.status = TOURNAMENT_STATUS.COMPLETED
completed.tournament.plannedRounds = [
  {
    id: 'plan-done',
    libraryRoundId: 'r1',
    snapshot: normalizeRound({ id: 'r1', name: 'R', mainRoundType: 'word' }),
    roundStatus: ROUND_PLAY_STATUS.COMPLETED,
    teamRoundScores: { t1: 20 },
    questionProgress: {},
    allocatedQuestionIds: ['mqb-1'],
  },
]
const beforePlanId = completed.tournament.plannedRounds[0].id
const syncResult = syncTournamentInstancesFromStageProfiles({
  tournamentInstances: { 'ti-semi-final-2': completed },
  stageProfiles: {
    quarter_final: { id: 'quarter_final', slots: [], playSettings: {} },
    semi_final: {
      id: 'semi_final',
      slots: [{ id: 's1', libraryRoundId: 'round-word-in-mukhada', questionCount: 5, sortOrder: 0 }],
      playSettings: {},
    },
    grand_finale: { id: 'grand_finale', slots: [], playSettings: {} },
  },
  roundLibrary: [
    normalizeRound({
      id: 'round-word-in-mukhada',
      name: 'Word-in-Mukhada Round',
      mainRoundType: 'word',
      questionBankId: QUESTION_BANK_ID.MUKHADA_WORD_32,
      questions: [],
    }),
  ],
  stageProfileId: 'semi_final',
  forceReplan: true,
})
assert.equal(
  syncResult.tournamentInstances['ti-semi-final-2'].tournament.plannedRounds[0].id,
  beforePlanId,
  'completed instance must not be replanned',
)

// Bank allocation single path
const bankRound = normalizeRound({
  id: 'round-word-in-mukhada',
  mainRoundType: 'word',
  questionBankId: QUESTION_BANK_ID.MUKHADA_WORD_32,
  questions: [],
})
const ids = resolveBankRoundAllocationIds(
  bankRound,
  { bankId: QUESTION_BANK_ID.MUKHADA_WORD_32, useCount: 3, pickMode: 'random', entryIds: [] },
  3,
  null,
)
assert.equal(ids.length, 3)
assert.ok(ids.every((id) => id.startsWith('mqb-')))

// --- Phase 1: migration ---
const roundA = normalizeRound({
  id: 'round-a',
  name: 'Audio Round',
  mainRoundType: 'audio',
  questions: [
    {
      id: 'rq-audio-1',
      mediaId: 'media-1',
      segmentStartSeconds: 1,
      segmentEndSeconds: 10,
      anchorNotes: 'Clip A',
      acceptedAnswer: 'Song A',
      selectedForRound: true,
      sortOrder: 0,
    },
  ],
})
assert.equal(roundA.questionFormat, QUESTION_FORMAT.LEGACY_UNSPECIFIED)
assert.deepEqual(roundA.assignmentQuestionIds, ['rq-audio-1'])

const { questionLibrary, roundLibrary } = migrateRoundLibraryToQuestionLibrary(
  [roundA, normalizeRound({ id: 'round-b', questionBankId: QUESTION_BANK_ID.MUKHADA_WORD_32, mainRoundType: 'word' })],
  [],
)
const mqb1 = questionLibrary.find((q) => q.id === 'mqb-1')
assert.ok(mqb1, 'bank entry lifted')
assert.equal(mqb1.media?.mediaId ?? null, null)
const audioQ = questionLibrary.find((q) => q.id === 'rq-audio-1')
assert.equal(audioQ.media.mediaId, 'media-1')
assert.equal(audioQ.media.segmentEndSeconds, 10)

const { questionLibrary: lib2 } = migrateRoundLibraryToQuestionLibrary(
  [
    normalizeRound({ id: 'round-b', questionBankId: QUESTION_BANK_ID.MUKHADA_WORD_32, mainRoundType: 'word' }),
    normalizeRound({ id: 'round-c', questionBankId: QUESTION_BANK_ID.MUKHADA_WORD_32, mainRoundType: 'word' }),
  ],
  [],
)
const mqb1Count = lib2.filter((q) => q.id === 'mqb-1').length
assert.equal(mqb1Count, 1, 'shared bank question must dedupe')

const wordRound = roundLibrary.find((r) => r.id === 'round-a')
assert.ok(wordRound.assignmentQuestionIds.includes('rq-audio-1'))

// normalizeGameState migration hook
const state = normalizeGameState({
  roundLibrary: [roundA],
  teams: [],
  tournament: { plannedRounds: [] },
})
assert.ok(Array.isArray(state.questionLibrary))
assert.ok(state.questionLibrary.length >= 1)

// v2 import without questionLibrary still validates
const v2pkg = {
  format: TOURNAMENT_EXPORT_FORMAT,
  formatVersion: TOURNAMENT_EXPORT_VERSION,
  packageId: 'test-pkg-1',
  tournament: { name: 'QF', plannedRounds: [] },
  roundLibrary: [roundA],
  teams: [],
  mediaCatalog: [],
  stageProfiles: {
    quarter_final: { id: 'quarter_final', slots: [] },
    semi_final: { id: 'semi_final', slots: [] },
    grand_finale: { id: 'grand_finale', slots: [] },
  },
  tournamentInstances: {
    'ti-quarter-final-1': createEmptyTournamentInstanceBundle('ti-quarter-final-1'),
  },
}
const imp = validateTournamentImportPackage(v2pkg)
assert.equal(imp.valid, true)
assert.equal(imp.data.questionLibrary.length, 0)

console.log('phase 0 + phase 1 tests passed')

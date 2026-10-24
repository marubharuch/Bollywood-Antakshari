import { normalizeRound } from '../rounds/roundModel.js'
import { resolveMainRoundType, MAIN_ROUND_TYPE } from '../rounds/mainRoundType.js'
import {
  countSelectedQuestions,
  getSelectedRoundQuestions,
  normalizeRoundQuestions,
} from '../rounds/roundQuestionModel.js'
import {
  eligibleQuestionsForLibraryRound,
  libraryRoundWithQuestionBankQuestions,
  roundUsesQuestionBank,
} from '../questionBank/questionBankRound.js'
import {
  createPlannedRound,
  normalizePlaySettings,
  normalizePlannedRound,
  snapshotRound,
} from './tournamentModel.js'
import { resolveRoundPlayQuestions } from '../questionLibrary/resolveRoundPlayQuestions.js'
import { STAGE_PROFILE_DEFS } from './tournamentRegistry.js'

function createSlotId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `slot-${crypto.randomUUID()}`
  }
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyStageProfile(profileId) {
  const def = STAGE_PROFILE_DEFS.find((d) => d.id === profileId)
  return {
    id: profileId,
    name: def?.name ?? profileId,
    slots: [],
    playSettings: normalizePlaySettings(null),
    savedAt: null,
  }
}

export function normalizeStageProfileSlot(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null
  const libraryRoundId =
    typeof raw.libraryRoundId === 'string' && raw.libraryRoundId.trim()
      ? raw.libraryRoundId.trim()
      : null
  if (!libraryRoundId) return null
  let questionCount = Number(raw.questionCount)
  if (!Number.isFinite(questionCount) || questionCount < 0) {
    questionCount = null
  }
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createSlotId(),
    libraryRoundId,
    questionCount: questionCount === null ? null : Math.floor(questionCount),
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : index,
  }
}

export function normalizeStageProfile(raw) {
  if (!raw || typeof raw !== 'object') {
    return createEmptyStageProfile(raw?.id ?? 'quarter_final')
  }
  const id =
    typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : 'quarter_final'
  const slots = Array.isArray(raw.slots)
    ? raw.slots
        .map((s, i) => normalizeStageProfileSlot(s, i))
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : []
  return {
    id,
    name:
      typeof raw.name === 'string' && raw.name.trim()
        ? raw.name.trim()
        : createEmptyStageProfile(id).name,
    slots,
    playSettings: normalizePlaySettings(raw.playSettings),
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : null,
  }
}

export function normalizeStageProfiles(raw) {
  const base = {
    quarter_final: createEmptyStageProfile('quarter_final'),
    semi_final: createEmptyStageProfile('semi_final'),
    grand_finale: createEmptyStageProfile('grand_finale'),
  }
  if (!raw || typeof raw !== 'object') return base
  return {
    quarter_final: normalizeStageProfile({ ...base.quarter_final, ...(raw.quarter_final ?? {}) }),
    semi_final: normalizeStageProfile({ ...base.semi_final, ...(raw.semi_final ?? {}) }),
    grand_finale: normalizeStageProfile({
      ...base.grand_finale,
      ...(raw.grand_finale ?? {}),
    }),
  }
}

export function isSimpleAntakshariRound(round) {
  return resolveMainRoundType(round) === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI
}

export function defaultQuestionCountForRound(round) {
  if (isSimpleAntakshariRound(round)) return null
  const selected = countSelectedQuestions(round?.questions)
  if (selected > 0) return selected
  const rulesCount = round?.rules?.questionCount
  if (typeof rulesCount === 'number' && rulesCount > 0) return rulesCount
  return 5
}

export function eligibleQuestionsForRound(round, questionLibrary = null) {
  const normalized = normalizeRound(round)
  const mainType = resolveMainRoundType(normalized)
  if (mainType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) return []
  if (Array.isArray(questionLibrary) && questionLibrary.length > 0) {
    const resolved = resolveRoundPlayQuestions(normalized, questionLibrary, {
      allowLegacyEmbedded: true,
    })
    if (resolved.questions.length > 0) return resolved.questions
  }
  if (roundUsesQuestionBank(normalized)) {
    return eligibleQuestionsForLibraryRound(normalized)
  }
  const qs = getSelectedRoundQuestions(normalized.questions)
  if (qs.length) return qs
  return normalizeRoundQuestions(normalized.questions).filter(
    (q) => q.selectedForRound !== false,
  )
}

/**
 * @param {object} profile
 * @param {object[]} roundLibrary
 */
export function validateStageProfile(profile, roundLibrary) {
  const errors = []
  const warnings = []
  const libById = new Map((roundLibrary ?? []).map((r) => [r.id, normalizeRound(r)]))

  if (!profile?.slots?.length) {
    errors.push('Add at least one round to this stage configuration.')
    return { valid: false, errors, warnings, slots: [] }
  }

  const slots = []
  for (const slot of profile.slots) {
    const round = libById.get(slot.libraryRoundId)
    if (!round) {
      errors.push(`Round library entry missing for slot (${slot.libraryRoundId}).`)
      continue
    }
    if (!round.active) {
      errors.push(`Round “${round.name}” is inactive. Activate it in the Round Library.`)
    }
    const simple = isSimpleAntakshariRound(round)
    const eligible = eligibleQuestionsForRound(round)
    let questionCount = slot.questionCount
    if (simple) {
      questionCount = null
    } else {
      if (questionCount === null || questionCount === undefined) {
        questionCount = defaultQuestionCountForRound(round)
      }
      if (!Number.isInteger(questionCount) || questionCount < 1) {
        errors.push(`“${round.name}”: question count must be a positive integer.`)
      } else if (eligible.length > 0 && questionCount > eligible.length) {
        errors.push(
          `“${round.name}”: needs ${questionCount} questions but only ${eligible.length} eligible in the library.`,
        )
      }
    }
    slots.push({
      ...slot,
      roundName: round.name,
      mainRoundType: resolveMainRoundType(round),
      questionCount,
      eligibleCount: eligible.length,
    })
  }

  return { valid: errors.length === 0, errors, warnings, slots }
}

function applyQuestionCountToSnapshot(libraryRound, questionCount, allocatedQuestionIds) {
  const snap = snapshotRound(libraryRound)
  if (!snap) return null
  if (isSimpleAntakshariRound(snap)) {
    return snap
  }
  const questions = normalizeRoundQuestions(snap.questions)
  if (allocatedQuestionIds?.length) {
    const byId = new Map(questions.map((q) => [q.id, q]))
    const picked = allocatedQuestionIds.map((id) => byId.get(id)).filter(Boolean)
    return normalizeRound({
      ...snap,
      questions: picked.length ? picked : questions,
      rules: {
        ...snap.rules,
        questionCount: picked.length || questionCount || snap.rules?.questionCount,
      },
    })
  }
  if (questionCount && questions.length > questionCount) {
    const picked = questions.slice(0, questionCount)
    return normalizeRound({
      ...snap,
      questions: picked,
      rules: { ...snap.rules, questionCount: picked.length },
    })
  }
  return normalizeRound({
    ...snap,
    rules: {
      ...snap.rules,
      questionCount: questionCount ?? countSelectedQuestions(questions) ?? snap.rules?.questionCount,
    },
  })
}

/**
 * Build planned rounds for one tournament instance (does not mutate library).
 * @param {object} profile
 * @param {object[]} roundLibrary
 * @param {Record<string, string[]>} allocationsByLibraryRoundId
 */
export function buildPlannedRoundsFromStageProfile(
  profile,
  roundLibrary,
  allocationsByLibraryRoundId = {},
) {
  const libById = new Map((roundLibrary ?? []).map((r) => [r.id, normalizeRound(r)]))
  const planned = []
  for (const slot of profile.slots ?? []) {
    const libRound = libById.get(slot.libraryRoundId)
    if (!libRound) continue
    const allocated = allocationsByLibraryRoundId[slot.libraryRoundId] ?? null
    const snap = applyQuestionCountToSnapshot(
      libraryRoundWithQuestionBankQuestions(libRound),
      slot.questionCount,
      allocated,
    )
    if (!snap) continue
    const plan = createPlannedRound(snap)
    if (!plan) continue
    planned.push(
      normalizePlannedRound({
        ...plan,
        libraryRoundId: slot.libraryRoundId,
        stageSlotId: slot.id,
        allocatedQuestionIds: allocated ?? [],
      }),
    )
  }
  return planned
}

export function slotsFromLegacyPlannedRounds(plannedRounds, roundLibrary) {
  const libById = new Map((roundLibrary ?? []).map((r) => [r.id, r]))
  return (plannedRounds ?? [])
    .map((plan, index) => {
      const libId = plan.libraryRoundId ?? plan.snapshot?.id
      const round = libById.get(libId) ?? plan.snapshot
      if (!libId) return null
      return normalizeStageProfileSlot({
        id: plan.stageSlotId ?? `legacy-slot-${index}`,
        libraryRoundId: libId,
        questionCount: isSimpleAntakshariRound(round)
          ? null
          : plan.allocatedQuestionIds?.length ||
            countSelectedQuestions(plan.snapshot?.questions) ||
            defaultQuestionCountForRound(plan.snapshot ?? round),
        sortOrder: index,
      })
    })
    .filter(Boolean)
}

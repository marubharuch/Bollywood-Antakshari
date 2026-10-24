import {
  eligibleQuestionsForRound,
  isSimpleAntakshariRound,
} from './stageProfileModel.js'
import { normalizeRound } from '../rounds/roundModel.js'
import { MAIN_ROUND_TYPE, resolveMainRoundType } from '../rounds/mainRoundType.js'
import { normalizeRoundQuestions } from '../rounds/roundQuestionModel.js'
import { wordRoundKeyFromQuestion } from '../rounds/wordRoundKey.js'
import {
  getTournamentInstanceDef,
  listInstancesForStageProfile,
} from './tournamentRegistry.js'
import { isInstanceActiveForEvent } from './tournamentEventModel.js'
import { roundUsesQuestionBank } from '../questionBank/questionBankRound.js'
import { resolveBankRoundAllocationIds } from './instanceQuestionAllocation.js'

function shuffleIds(ids) {
  const copy = [...ids]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function collectUsedQuestionIdsForStage(
  instances,
  stageProfileId,
  excludeInstanceId,
  eventSettings = null,
) {
  /** @type {Map<string, Set<string>>} */
  const byRound = new Map()
  const defs = listInstancesForStageProfile(stageProfileId).filter((def) =>
    !eventSettings || isInstanceActiveForEvent(def.id, eventSettings),
  )
  for (const def of defs) {
    if (def.id === excludeInstanceId) continue
    const bundle = instances?.[def.id]
    const rounds = bundle?.tournament?.plannedRounds ?? []
    for (const plan of rounds) {
      const libId = plan.libraryRoundId ?? plan.snapshot?.id
      if (!libId) continue
      const ids = plan.allocatedQuestionIds ?? []
      if (!byRound.has(libId)) byRound.set(libId, new Set())
      const set = byRound.get(libId)
      for (const id of ids) set.add(id)
      const progress = plan.questionProgress?.questions ?? []
      for (const q of progress) {
        if (q?.libraryQuestionId) set.add(q.libraryQuestionId)
        if (q?.id) set.add(q.id)
      }
    }
  }
  return byRound
}

function questionWordKeyById(round, questionId) {
  if (!round || !questionId) return ''
  const qs = normalizeRoundQuestions(round.questions)
  const q = qs.find((item) => item.id === questionId)
  return wordRoundKeyFromQuestion(q)
}

/**
 * Hindi word targets used anywhere in the show (all tournament instances), excluding one instance.
 * @param {Record<string, object>} instances
 * @param {object[]} roundLibrary
 * @param {string} excludeInstanceId
 */
export function collectUsedWordKeysForShow(instances, roundLibrary, excludeInstanceId) {
  const libById = new Map((roundLibrary ?? []).map((r) => [r.id, normalizeRound(r)]))
  const used = new Set()
  const instanceIds = Object.keys(instances ?? {})
  for (const instanceId of instanceIds) {
    if (instanceId === excludeInstanceId) continue
    const bundle = instances[instanceId]
    const rounds = bundle?.tournament?.plannedRounds ?? []
    for (const plan of rounds) {
      const libId = plan.libraryRoundId ?? plan.snapshot?.id
      const round = libById.get(libId) ?? (plan.snapshot ? normalizeRound(plan.snapshot) : null)
      if (!round || resolveMainRoundType(round) !== MAIN_ROUND_TYPE.WORD) continue
      const ids = new Set()
      for (const id of plan.allocatedQuestionIds ?? []) ids.add(id)
      const progress = plan.questionProgress?.questions ?? []
      for (const q of progress) {
        if (q?.libraryQuestionId) ids.add(q.libraryQuestionId)
        if (q?.id) ids.add(q.id)
      }
      for (const id of ids) {
        const key = questionWordKeyById(round, id)
        if (key) used.add(key)
      }
    }
  }
  return used
}

/**
 * @param {object} profile
 * @param {object[]} roundLibrary
 * @param {Record<string, object>} instances
 * @param {string} targetInstanceId
 * @param {{ allowReuse?: boolean, shuffle?: boolean }} options
 */
export function allocateQuestionsForInstance(
  profile,
  roundLibrary,
  instances,
  targetInstanceId,
  options = {},
  eventSettings = null,
  questionLibrary = [],
) {
  const def = getTournamentInstanceDef(targetInstanceId)
  if (!def) {
    return { success: false, errors: ['Unknown tournament instance.'], allocations: {} }
  }
  const libById = new Map((roundLibrary ?? []).map((r) => [r.id, normalizeRound(r)]))
  const used = collectUsedQuestionIdsForStage(
    instances,
    def.stageProfileId,
    targetInstanceId,
    eventSettings,
  )
  const allocations = {}
  const errors = []
  const shortages = []
  const usedWordKeysForShow = collectUsedWordKeysForShow(
    instances,
    roundLibrary,
    targetInstanceId,
  )

  for (const slot of profile.slots ?? []) {
    const round = libById.get(slot.libraryRoundId)
    if (!round) continue
    if (isSimpleAntakshariRound(round)) {
      allocations[slot.libraryRoundId] = []
      continue
    }
    const need = slot.questionCount
    if (!need || need < 1) {
      errors.push(`Question count missing for round slot ${slot.libraryRoundId}.`)
      continue
    }
    if (roundUsesQuestionBank(round)) {
      const bundle = instances?.[targetInstanceId]
      const selection = bundle?.questionBankSelections?.[slot.libraryRoundId]
      const pick = resolveBankRoundAllocationIds(
        round,
        selection,
        need,
        usedWordKeysForShow,
      )
      const eligibleBank = eligibleQuestionsForRound(round, questionLibrary)
      if (pick.length < need && !options.allowReuse) {
        shortages.push({
          libraryRoundId: slot.libraryRoundId,
          roundName: round.name,
          needed: need,
          availableUnique: pick.length,
          totalEligible: eligibleBank.length,
          wordRound: true,
        })
        continue
      }
      const finalPick =
        pick.length >= need
          ? pick.slice(0, need)
          : shuffleIds(
              pick.length ? pick : eligibleBank.map((q) => q.id),
            ).slice(0, need)
      allocations[slot.libraryRoundId] = finalPick
      for (const id of finalPick) {
        const q = eligibleQuestionsForRound(round).find((item) => item.id === id)
        const key = wordRoundKeyFromQuestion(q)
        if (key) usedWordKeysForShow.add(key)
      }
      continue
    }
    const eligible = eligibleQuestionsForRound(round, questionLibrary)
    const eligibleIds = eligible.map((q) => q.id)
    const usedSet = used.get(slot.libraryRoundId) ?? new Set()
    const isWordRound = resolveMainRoundType(round) === MAIN_ROUND_TYPE.WORD
    const eligibleById = new Map(eligible.map((q) => [q.id, q]))
    let pool = eligibleIds.filter((id) => {
      if (usedSet.has(id)) return false
      if (!isWordRound) return true
      const key = wordRoundKeyFromQuestion(eligibleById.get(id))
      return !key || !usedWordKeysForShow.has(key)
    })
    if (pool.length < need && options.allowReuse) {
      pool = [...eligibleIds]
    }
    if (pool.length < need) {
      shortages.push({
        libraryRoundId: slot.libraryRoundId,
        roundName: round.name,
        needed: need,
        availableUnique: pool.length,
        totalEligible: eligibleIds.length,
        wordRound: isWordRound,
      })
      continue
    }
    const pick = options.shuffle ? shuffleIds(pool).slice(0, need) : pool.slice(0, need)
    allocations[slot.libraryRoundId] = pick
    if (isWordRound) {
      for (const id of pick) {
        const key = wordRoundKeyFromQuestion(eligibleById.get(id))
        if (key) usedWordKeysForShow.add(key)
      }
    }
  }

  if (shortages.length && !options.allowReuse) {
    return {
      success: false,
      errors: shortages.map((s) =>
        s.wordRound
          ? `“${s.roundName}”: need ${s.needed} unique Hindi words but only ${s.availableUnique} remain unused in this show (${s.totalEligible} eligible in library).`
          : `“${s.roundName}”: need ${s.needed} unique questions but only ${s.availableUnique} remain for this stage (${s.totalEligible} eligible in library).`,
      ),
      shortages,
      allocations,
    }
  }

  if (errors.length) {
    return { success: false, errors, allocations }
  }

  return { success: true, errors: [], allocations, shortages: [] }
}

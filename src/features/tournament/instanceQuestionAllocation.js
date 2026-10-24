import {
  resolveQuestionBankAllocationIds,
  roundUsesQuestionBank,
} from '../questionBank/questionBankRound.js'

/**
 * ## Instance question allocation (two layers)
 *
 * **`questionBankSelections`** (on `tournamentInstances[id]`):
 * Admin intent for bank-backed library rounds — pick mode (random/manual), `useCount`,
 * and manual `entryIds` (numeric bank row ids). Edited from Tournament Instance config.
 *
 * **`allocatedQuestionIds`** (on each `plannedRound`):
 * Frozen ordered play ids (`rq-*` / `mqb-*`) written when the instance is validated/prepared
 * or when planned rounds are built from a stage profile. Used by `buildQuestionQueue` at play time.
 *
 * Bank-backed rounds must resolve allocations only through `resolveBankRoundAllocationIds`
 * so manual/random selection stays consistent.
 */

/**
 * @param {object} libRound normalized round library entry
 * @param {object | null | undefined} questionBankSelection bundle.questionBankSelections[libraryRoundId]
 * @param {number} slotQuestionCount from stage profile slot
 * @param {Set<string>} [excludeWordKeys] show-wide used word keys
 */
export function resolveBankRoundAllocationIds(
  libRound,
  questionBankSelection,
  slotQuestionCount,
  excludeWordKeys = null,
) {
  if (!roundUsesQuestionBank(libRound)) return []
  return resolveQuestionBankAllocationIds(
    libRound,
    questionBankSelection,
    slotQuestionCount,
    excludeWordKeys,
  )
}

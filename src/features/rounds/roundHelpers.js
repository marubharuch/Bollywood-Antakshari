import { formatRoundRulesSummary, getCategoryLabel } from './roundModel.js'

export { formatRoundRulesSummary, getCategoryLabel }

/**
 * @param {import('./roundModel.js').RoundDefinition | undefined} round
 * @param {import('./roundModel.js').RoundDefinition[]} library
 */
export function resolveSelectedRound(round, library, selectedRoundId) {
  if (round) return round
  if (!selectedRoundId || !Array.isArray(library)) return null
  return library.find((r) => r.id === selectedRoundId) ?? null
}

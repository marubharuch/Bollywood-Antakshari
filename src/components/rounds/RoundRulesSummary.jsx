import { Badge } from '../common/Badge.jsx'
import { formatRoundRulesSummary, getCategoryLabel } from '../../features/rounds/roundHelpers.js'

export function RoundRulesSummary({ round, selected = false, compact = false }) {
  if (!round) {
    return (
      <p className="text-sm text-slate-500">
        No round selected for tournament use.
      </p>
    )
  }

  if (compact) {
    return (
      <p className="text-xs text-slate-400">{formatRoundRulesSummary(round)}</p>
    )
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-white">{round.name}</p>
        <Badge tone={round.active ? 'live' : 'paused'}>
          {round.active ? 'Active' : 'Inactive'}
        </Badge>
        {selected && <Badge tone="demo">Selected</Badge>}
        <Badge tone="idle">{getCategoryLabel(round.category)}</Badge>
      </div>
      {round.description && (
        <p className="mt-1 text-xs text-slate-400">{round.description}</p>
      )}
      <p className="mt-2 text-xs text-slate-300">{formatRoundRulesSummary(round)}</p>
      {round.instructions && (
        <p className="mt-2 text-xs text-slate-500">
          <span className="text-slate-400">Instructions:</span> {round.instructions}
        </p>
      )}
    </div>
  )
}

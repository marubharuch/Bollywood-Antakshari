import { RoundRulesSummary } from '../../rounds/RoundRulesSummary.jsx'
import { Button } from '../../common/Button.jsx'

export function RoundStartPanel({ round, roundNumber, onStart, onBack }) {
  if (!round) {
    return <p className="text-sm text-slate-400">Round not found.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-lg font-semibold text-white">
        {roundNumber ? `Round ${roundNumber}: ` : ''}{round.name}
      </p>
      <RoundRulesSummary round={round} selected compact />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="gold" onClick={onStart}>Start Round</Button>
        <Button size="sm" variant="ghost" onClick={onBack}>← Back to rounds</Button>
      </div>
    </div>
  )
}

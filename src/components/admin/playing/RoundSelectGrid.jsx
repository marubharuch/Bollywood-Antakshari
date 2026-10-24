import { ROUND_PLAY_STATUS } from '../../../features/tournament/tournamentModel.js'
import { ROUND_PLAY_TYPE, resolveRoundPlayType } from '../../../features/rounds/roundPlayType.js'
import { getRoundPlayAction } from '../../../features/tournament/roundSequence.js'
import { Badge } from '../../common/Badge.jsx'
import { Button } from '../../common/Button.jsx'

function roundTone(status) {
  if (status === ROUND_PLAY_STATUS.ACTIVE) return 'live'
  if (status === ROUND_PLAY_STATUS.COMPLETED) return 'demo'
  if (status === ROUND_PLAY_STATUS.SKIPPED) return 'paused'
  return 'idle'
}

export function RoundSelectGrid({
  tournament,
  onPlay,
  onSkip,
  onShowTotals,
  onEditSimpleScores,
  onBack,
}) {
  const rounds = tournament?.plannedRounds ?? []

  return (
    <div className="space-y-3">
      <p className="text-sm text-amber-100">{tournament?.name}</p>
      <p className="text-[11px] text-slate-500">
        Play rounds in order. Skipped rounds can be played later with Play Skipped Round.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rounds.map((plan, index) => {
          const action = getRoundPlayAction(plan, index, rounds)
          const isSkipped = action === 'play_skipped'
          const canPlay = action === 'play' || isSkipped
          const completed = plan.roundStatus === ROUND_PLAY_STATUS.COMPLETED
          const simpleFinalized =
            completed &&
            resolveRoundPlayType(plan.snapshot) === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI
          return (
            <li
              key={plan.id}
              className={`rounded-lg border p-3 ${
                completed ? 'border-slate-800 opacity-60' : 'border-slate-600 bg-slate-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">
                    {index + 1}. {plan.snapshot?.name}
                  </p>
                  <Badge tone={roundTone(plan.roundStatus)} className="mt-1 normal-case tracking-normal">
                    {plan.roundStatus}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="gold"
                  disabled={!canPlay}
                  onClick={() => onPlay(plan.id, isSkipped)}
                >
                  {isSkipped ? 'Play Skipped Round' : 'Play'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={completed || isSkipped || !canPlay}
                  onClick={() => onSkip(plan.id)}
                >
                  Skip
                </Button>
                {simpleFinalized && onEditSimpleScores && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEditSimpleScores(plan.id)}
                  >
                    Edit Scores
                  </Button>
                )}
              </div>
              {!canPlay && !completed && plan.roundStatus === ROUND_PLAY_STATUS.PENDING && (
                <p className="mt-1 text-[10px] text-slate-500">Complete earlier rounds first.</p>
              )}
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        {onShowTotals && (
          <Button size="sm" variant="secondary" onClick={onShowTotals}>
            Show Total Scores
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onBack}>← Back</Button>
      </div>
    </div>
  )
}

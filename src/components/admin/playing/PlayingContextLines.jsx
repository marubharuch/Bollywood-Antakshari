import { ANCHOR_STEPS } from '../../../features/tournament/tournamentModel.js'
import { getHostConsoleStatus } from '../../../utils/gameHelpers.js'

export function PlayingContextLines({ state, step, activeRound, pendingRound, questionIndex }) {
  const status = getHostConsoleStatus(state)
  const items = []

  if (state.tournament?.name) {
    items.push({ label: 'Tournament', value: state.tournament.name })
  }

  if (step === ANCHOR_STEPS.ROUND_START && pendingRound?.snapshot?.name) {
    items.push({ label: 'Current round', value: pendingRound.snapshot.name })
  } else if (
    (step === ANCHOR_STEPS.QUESTION_PICK || step === ANCHOR_STEPS.QUESTION_LIVE) &&
    activeRound?.name
  ) {
    items.push({ label: 'Current round', value: activeRound.name })
  }

  if (step === ANCHOR_STEPS.QUESTION_LIVE && state.playSession?.playPhase === 'live') {
    const total = state.playSession?.questions?.length ?? 0
    if (total > 0) {
      items.push({
        label: 'Question',
        value: `Q${(questionIndex ?? 0) + 1} of ${total}`,
      })
    }
  }

  items.push({ label: 'Status', value: status.label })

  if (!items.length) return null

  return (
    <div className="text-xs text-slate-400" aria-live="polite">
      {items.map((item) => (
        <p key={item.label}>
          <span className="text-slate-500">{item.label}:</span>{' '}
          <span className="text-slate-200">{item.value}</span>
        </p>
      ))}
    </div>
  )
}

import { ANCHOR_STEPS } from '../../../features/tournament/tournamentModel.js'
import { Badge } from '../../common/Badge.jsx'

const FLOW = [
  { step: ANCHOR_STEPS.TOURNAMENT_SELECT, label: 'Tournament' },
  { step: ANCHOR_STEPS.ROUND_SELECT, label: 'Rounds' },
  { step: ANCHOR_STEPS.ROUND_START, label: 'Start' },
  { step: ANCHOR_STEPS.QUESTION_PICK, label: 'Question' },
  { step: ANCHOR_STEPS.QUESTION_LIVE, label: 'Live' },
]

export function AnchorStepNav({ currentStep }) {
  const idx = FLOW.findIndex((f) => f.step === currentStep)
  return (
    <div className="flex flex-wrap gap-1" aria-label="Anchor progress">
      {FLOW.map((f, i) => (
        <Badge key={f.step} tone={i === idx ? 'live' : i < idx ? 'demo' : 'idle'}>
          {f.label}
        </Badge>
      ))}
    </div>
  )
}

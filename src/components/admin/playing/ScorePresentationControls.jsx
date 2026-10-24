import { isScorePresentationActive } from '../../../features/presentation/scorePresentationModel.js'
import { Button } from '../../common/Button.jsx'

export function ScorePresentationControls({ scorePresentation, onNext, onSkip }) {
  if (!isScorePresentationActive(scorePresentation)) return null

  const onTeamPhase = scorePresentation.phase === 'team'
  const label = onTeamPhase ? 'Next team' : 'Done'

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-950/30 px-2 py-1.5">
      <span className="text-xs text-amber-100">
        {scorePresentation.phase === 'scoreboard' ? 'Standings on projector' : 'Score presentation on projector'}
      </span>
      <Button size="sm" variant="gold" onClick={onNext}>
        {label}
      </Button>
      <Button size="sm" variant="outline" onClick={onSkip}>
        Skip presentation
      </Button>
    </div>
  )
}

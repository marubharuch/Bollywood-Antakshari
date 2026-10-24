import { SCORE_DISPLAY_MODE } from '../../../features/presentation/scoreDisplayModel.js'
import { Button } from '../../common/Button.jsx'

export function ScoreDisplayControls({ scoreDisplay, onSetMode, onHideScores }) {
  const on = Boolean(scoreDisplay?.projectorOn)
  const mode = scoreDisplay?.mode ?? SCORE_DISPLAY_MODE.OFF

  const active = (target) => on && mode === target

  return (
    <section
      className="flex flex-wrap items-center gap-1"
      aria-label="Projector score display"
    >
      <Button
        size="sm"
        variant={active(SCORE_DISPLAY_MODE.TEAM) ? 'primary' : 'outline'}
        pressed={active(SCORE_DISPLAY_MODE.TEAM)}
        onClick={() => onSetMode(SCORE_DISPLAY_MODE.TEAM)}
      >
        Current Team Score
      </Button>
      <Button
        size="sm"
        variant={active(SCORE_DISPLAY_MODE.ROUND) ? 'primary' : 'outline'}
        pressed={active(SCORE_DISPLAY_MODE.ROUND)}
        onClick={() => onSetMode(SCORE_DISPLAY_MODE.ROUND)}
      >
        Current Round Score
      </Button>
      <Button
        size="sm"
        variant={active(SCORE_DISPLAY_MODE.ALL) ? 'primary' : 'outline'}
        pressed={active(SCORE_DISPLAY_MODE.ALL)}
        onClick={() => onSetMode(SCORE_DISPLAY_MODE.ALL)}
      >
        All Played Rounds Score
      </Button>
      <Button
        size="sm"
        variant={!on || mode === SCORE_DISPLAY_MODE.OFF ? 'secondary' : 'ghost'}
        pressed={!on || mode === SCORE_DISPLAY_MODE.OFF}
        onClick={onHideScores}
      >
        Hide Scores
      </Button>
    </section>
  )
}

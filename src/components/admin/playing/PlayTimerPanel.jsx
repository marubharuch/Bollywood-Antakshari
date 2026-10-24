import { Button } from '../../common/Button.jsx'
import {
  BUZZER_ANSWER_TIMER_SECONDS,
  PLAY_TIMER_SECONDS,
} from '../../../features/tournament/tournamentModel.js'

export function PlayTimerPanel({ playTimer, onStart, onPause }) {
  const total =
    playTimer?.totalSeconds ??
    (playTimer?.kind === 'buzzer_answer' ? BUZZER_ANSWER_TIMER_SECONDS : PLAY_TIMER_SECONDS)
  const remaining = playTimer?.remainingSeconds ?? total
  const locked = Boolean(playTimer?.locked)
  const running = Boolean(playTimer?.running)
  const buzzerTimer = playTimer?.kind === 'buzzer_answer'

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-slate-400">
        {buzzerTimer ? 'Answer timer' : 'Timer'}
      </span>
      <span className="text-2xl font-bold tabular-nums text-rose-300">{remaining}s</span>
      <span className="text-xs text-slate-500">/ {total}s</span>
      {locked ? (
        <span className="text-xs text-slate-500">Time&apos;s up</span>
      ) : running ? (
        <Button size="sm" variant="outline" onClick={onPause}>
          Pause
        </Button>
      ) : (
        <Button size="sm" variant="gold" onClick={onStart}>
          Start Timer
        </Button>
      )}
    </div>
  )
}

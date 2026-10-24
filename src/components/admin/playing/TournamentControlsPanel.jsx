import { Button } from '../../common/Button.jsx'
import {
  canCompleteTournament,
  canPauseTournament,
  canResumePausedTournament,
  canResumeStoppedTournament,
  canStopTournament,
  isTournamentSessionVisible,
} from '../../../features/tournament/tournamentLifecycle.js'

export function TournamentControlsPanel({
  state,
  onPause,
  onResumePaused,
  onStop,
  onResumeStopped,
  onComplete,
  onNotify,
}) {
  if (!isTournamentSessionVisible(state)) return null

  const showPause = canPauseTournament(state)
  const showResumePaused = canResumePausedTournament(state)
  const showStop = canStopTournament(state)
  const showResumeStopped = canResumeStoppedTournament(state)
  const showComplete = canCompleteTournament(state)

  if (!showPause && !showResumePaused && !showStop && !showResumeStopped && !showComplete) {
    return null
  }

  const handleStop = () => {
    const ok = window.confirm(
      'Are you sure you want to stop this tournament? Your progress and scores will be saved.',
    )
    if (!ok) return
    const r = onStop()
    if (!r.success) onNotify(r.error ?? 'Could not stop tournament.', 'error')
    else onNotify('Tournament stopped. Resume when ready.', 'info')
  }

  const handleComplete = () => {
    const ok = window.confirm(
      'Mark this tournament as completed? Final scores will be saved and scoring will be locked.',
    )
    if (!ok) return
    const r = onComplete()
    if (!r.success) onNotify(r.error ?? 'Could not complete tournament.', 'error')
    else onNotify('Tournament completed.', 'success')
  }

  return (
    <section
      className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-900/50 px-2 py-1.5"
      aria-label="Tournament controls"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Tournament
      </span>
      {showPause && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const r = onPause()
            if (!r.success) onNotify(r.error ?? 'Could not pause.', 'warning')
            else onNotify('Tournament paused.', 'info')
          }}
        >
          Pause
        </Button>
      )}
      {showResumePaused && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const r = onResumePaused()
            if (!r.success) onNotify(r.error ?? 'Could not resume.', 'warning')
            else onNotify('Tournament resumed.', 'success')
          }}
        >
          Resume
        </Button>
      )}
      {showResumeStopped && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const r = onResumeStopped()
            if (!r.success) onNotify(r.error ?? 'Could not resume.', 'warning')
            else onNotify('Tournament resumed from saved progress.', 'success')
          }}
        >
          Resume Tournament
        </Button>
      )}
      {showStop && (
        <Button size="sm" variant="outline" className="border-rose-800/60 text-rose-200" onClick={handleStop}>
          Stop Tournament
        </Button>
      )}
      {showComplete && (
        <Button size="sm" variant="gold" onClick={handleComplete}>
          Complete Tournament
        </Button>
      )}
    </section>
  )
}

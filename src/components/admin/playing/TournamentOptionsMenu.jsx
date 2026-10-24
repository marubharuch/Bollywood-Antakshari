import { useState } from 'react'
import { Button } from '../../common/Button.jsx'
import {
  canCompleteTournament,
  canResumeStoppedTournament,
  canStopTournament,
  isTournamentSessionVisible,
} from '../../../features/tournament/tournamentLifecycle.js'

export function TournamentOptionsMenu({
  state,
  onStop,
  onResumeStopped,
  onComplete,
  onReset,
  onNotify,
}) {
  const [open, setOpen] = useState(false)
  if (!isTournamentSessionVisible(state)) return null

  const showStop = canStopTournament(state)
  const showResumeStopped = canResumeStoppedTournament(state)
  const showComplete = canCompleteTournament(state)

  const handleStop = () => {
    setOpen(false)
    const ok = window.confirm(
      'Are you sure you want to stop this tournament? Your progress and scores will be saved.',
    )
    if (!ok) return
    const r = onStop()
    if (!r.success) onNotify(r.error ?? 'Could not stop tournament.', 'error')
    else onNotify('Tournament stopped. Resume when ready.', 'info')
  }

  const handleComplete = () => {
    setOpen(false)
    const ok = window.confirm(
      'Mark this tournament as completed? Final scores will be saved and scoring will be locked.',
    )
    if (!ok) return
    const r = onComplete()
    if (!r.success) onNotify(r.error ?? 'Could not complete tournament.', 'error')
    else onNotify('Tournament completed.', 'success')
  }

  const handleReset = () => {
    setOpen(false)
    const ok = window.confirm(
      'Reset this tournament for a new game? All scores and gameplay progress for this tournament will be cleared. Tournament configuration, teams, planned rounds and question settings will remain unchanged.',
    )
    if (!ok) return
    const r = onReset()
    if (!r.success) onNotify(r.error ?? 'Could not reset tournament.', 'error')
    else onNotify('Tournament reset successfully.', 'success')
  }

  const handleResumeStopped = () => {
    setOpen(false)
    const r = onResumeStopped()
    if (!r.success) onNotify(r.error ?? 'Could not resume.', 'warning')
    else onNotify('Tournament resumed from saved progress.', 'success')
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        pressed={open}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Tournament Options
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-md border border-slate-700 bg-slate-900 py-1 shadow-lg"
        >
          {showResumeStopped && (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
              onClick={handleResumeStopped}
            >
              Resume Tournament
            </button>
          )}
          {showStop && (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-xs text-rose-200 hover:bg-slate-800"
              onClick={handleStop}
            >
              Stop Tournament
            </button>
          )}
          {showComplete && (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-xs text-amber-100 hover:bg-slate-800"
              onClick={handleComplete}
            >
              Complete Tournament
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="block w-full border-t border-slate-800 px-3 py-1.5 text-left text-xs text-rose-200/90 hover:bg-slate-800"
            onClick={handleReset}
          >
            Reset Tournament
          </button>
        </div>
      )}
    </div>
  )
}

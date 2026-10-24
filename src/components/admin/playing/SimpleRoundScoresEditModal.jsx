import { useEffect, useState } from 'react'
import { getTeamRoundScore } from '../../../features/tournament/roundScoreLedger.js'
import { Button } from '../../common/Button.jsx'

export function SimpleRoundScoresEditModal({
  open,
  onClose,
  roundLabel,
  planned,
  teams,
  onSaveTeamScore,
  onNotify,
}) {
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!open) {
      setEditingTeamId(null)
      setDraft('')
    }
  }, [open])

  if (!open || !planned) return null

  const startEdit = (teamId) => {
    const current = getTeamRoundScore(planned, teamId)
    setEditingTeamId(teamId)
    setDraft(String(current))
  }

  const saveEdit = (teamId, teamName) => {
    const parsed = Math.max(0, Math.round(Number(draft) || 0))
    const current = getTeamRoundScore(planned, teamId)
    const message = `Replace ${teamName}'s Simple Antakshari score (${current} → ${parsed})? This updates the round total, not an add-on.`
    if (!window.confirm(message)) return
    const r = onSaveTeamScore(teamId, parsed)
    if (!r?.success) {
      onNotify?.(r?.error ?? 'Could not save score.', 'error')
      return
    }
    onNotify?.(`${teamName}: round score set to ${parsed}.`, 'success')
    setEditingTeamId(null)
    setDraft('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="simple-round-edit-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-amber-500/40 bg-slate-900 p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="simple-round-edit-title" className="text-lg font-semibold text-amber-100">
              Edit Scores
            </h2>
            <p className="text-sm text-slate-400">{roundLabel}</p>
            <p className="mt-1 text-xs text-slate-500">
              One score per team for this round. Corrections replace the saved value.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <ul className="mt-4 space-y-2">
          {(teams ?? []).map((team) => {
            const roundPts = getTeamRoundScore(planned, team.id)
            const editing = editingTeamId === team.id
            return (
              <li
                key={team.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white">{team.name}</p>
                  <p className="text-sm tabular-nums text-rose-300">
                    Round score: <span className="font-bold">{roundPts}</span>
                  </p>
                </div>
                {editing ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className="w-20 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <Button size="sm" variant="gold" onClick={() => saveEdit(team.id, team.name)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingTeamId(null)
                        setDraft('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startEdit(team.id)}>
                    Edit Score
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

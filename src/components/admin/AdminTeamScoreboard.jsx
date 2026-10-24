import { useState } from 'react'
import { Button } from '../common/Button.jsx'

function EditableRoundScore({ value, disabled, compact, onCommit }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const cancel = () => {
    setDraft('')
    setEditing(false)
  }

  const startEdit = () => {
    if (disabled) return
    setDraft(String(value))
    setEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed === '') {
      cancel()
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      cancel()
      return
    }
    const next = Math.max(0, Math.round(parsed))
    if (next !== value) onCommit(next)
    setEditing(false)
  }

  const sizeClass = compact ? 'text-base w-[3.25rem]' : 'text-xl w-[3.5rem]'

  if (editing && !disabled) {
    return (
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        autoFocus
        className={`rounded border border-amber-500/50 bg-slate-950 px-1 py-0.5 font-bold tabular-nums text-amber-100 outline-none focus:ring-1 focus:ring-amber-400 ${sizeClass}`}
        value={draft}
        aria-label="Edit team score for this round"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={`group flex items-baseline gap-1 text-left font-bold tabular-nums text-amber-200 disabled:cursor-default disabled:opacity-100 ${sizeClass}`}
      aria-label={`Score ${value}. Click to edit.`}
      onClick={startEdit}
    >
      <span>{value}</span>
      {!disabled && (
        <span className="text-[11px] font-normal text-slate-400" aria-hidden title="Edit score">
          ✎
        </span>
      )}
    </button>
  )
}

export function AdminTeamScoreboard({
  teams,
  teamIds,
  onAdjustScore,
  onSetRoundScore,
  scoreDelta,
  compact = false,
  highlightTeamId = null,
  enabledTeamIds = null,
  roundScoreByTeamId = null,
  roundScoresLocked = false,
}) {
  const visible =
    teamIds?.length ? teams.filter((t) => teamIds.includes(t.id)) : teams
  const plus = scoreDelta?.correctPoints ?? scoreDelta?.plus ?? 5
  const minus = scoreDelta?.wrongPenalty ?? scoreDelta?.minus ?? 5
  if (!visible?.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-600 p-4 text-center text-sm text-slate-400">
        No teams loaded.
      </p>
    )
  }

  const canEditRoundScore = Boolean(roundScoreByTeamId && onSetRoundScore && !roundScoresLocked)

  return (
    <ul
      className={
        compact
          ? 'grid grid-cols-2 gap-1 lg:grid-cols-4'
          : 'grid grid-cols-2 gap-2 xl:grid-cols-4'
      }
    >
      {visible.map((team) => {
        const enabled =
          !enabledTeamIds?.length || enabledTeamIds.includes(team.id)
        const highlighted = highlightTeamId === team.id
        const roundScore = roundScoreByTeamId?.[team.id] ?? 0
        return (
        <li
          key={team.id}
          className={`flex items-center justify-between gap-1 rounded-md border bg-slate-800/70 ${
            highlighted ? 'border-amber-400/70 ring-1 ring-amber-400/40' : 'border-slate-700'
          } ${compact ? 'px-1.5 py-1' : 'px-2.5 py-2'} ${!enabled ? 'opacity-45' : ''}`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: team.accent }}
                aria-hidden
              />
              <p className={`truncate font-medium text-white ${compact ? 'text-xs' : 'text-sm'}`}>
                {team.name}
              </p>
            </div>
            {roundScoreByTeamId ? (
              <>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-1">
                  {canEditRoundScore ? (
                    <EditableRoundScore
                      value={roundScore}
                      compact={compact}
                      disabled={!enabled}
                      onCommit={(next) => onSetRoundScore(team.id, next, team.name)}
                    />
                  ) : (
                    <p
                      className={`font-bold tabular-nums leading-tight text-amber-200 ${
                        compact ? 'text-base' : 'text-xl'
                      }`}
                    >
                      {roundScore}
                    </p>
                  )}
                </div>
                <p className={`tabular-nums text-slate-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  Tournament total {team.score}
                </p>
              </>
            ) : (
              <p
                className={`font-bold tabular-nums leading-tight text-rose-300 ${
                  compact ? 'text-base' : 'text-xl'
                }`}
                aria-live="polite"
                aria-atomic="true"
              >
                {team.score}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              size="sm"
              variant="secondary"
              disabled={!enabled}
              aria-label={`Increase score for ${team.name}`}
              onClick={() => onAdjustScore(team.id, plus, team.name)}
            >
              +{plus}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!enabled}
              aria-label={`Record zero points for ${team.name}`}
              onClick={() => onAdjustScore(team.id, 0, team.name)}
            >
              0
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!enabled}
              aria-label={`Decrease score for ${team.name}`}
              onClick={() => onAdjustScore(team.id, -minus, team.name)}
            >
              −{minus}
            </Button>
          </div>
        </li>
      )})}
    </ul>
  )
}

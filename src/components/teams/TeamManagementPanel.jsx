import { useState } from 'react'
import { Button } from '../common/Button.jsx'
import { InlineAlert } from '../common/InlineAlert.jsx'
import { pickAvailableTeamColor as pickColor } from '../../features/tournament/teamModel.js'

export function TeamManagementPanel({
  teams,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
  onNotify,
}) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(() => pickColor([]))
  const [formError, setFormError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#e11d48')
  const [editError, setEditError] = useState(null)

  const teamCount = teams?.length ?? 0

  const handleAdd = () => {
    setFormError(null)
    const result = onAddTeam(newName, newColor)
    if (!result.success) {
      setFormError(result.error)
      onNotify?.(result.error, 'error')
      return
    }
    onNotify?.(`Added “${result.team.name}”.`, 'success')
    setNewName('')
    setNewColor(pickColor([...(teams ?? []), result.team]))
  }

  const startEdit = (team) => {
    setEditingId(team.id)
    setEditName(team.name)
    setEditColor(team.accent)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const saveEdit = () => {
    if (!editingId) return
    setEditError(null)
    const result = onUpdateTeam(editingId, { name: editName, accent: editColor })
    if (!result.success) {
      setEditError(result.error)
      onNotify?.(result.error, 'error')
      return
    }
    onNotify?.(`Updated “${result.team.name}”.`, 'success')
    setEditingId(null)
  }

  const handleDelete = (team) => {
    const confirmed = window.confirm(
      `Delete “${team.name}”?\n\nThis removes the team from the roster and display. Scores for this team will be lost.`,
    )
    if (!confirmed) return

    const result = onDeleteTeam(team.id)
    if (!result.success) {
      onNotify?.(result.error, 'error')
      return
    }
    if (editingId === team.id) setEditingId(null)
    onNotify?.(`Deleted “${result.team.name}”.`, 'success')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">Team roster</h2>
          <p className="text-xs text-slate-400">
            {teamCount} team{teamCount === 1 ? '' : 's'} · scores sync to projector
          </p>
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-2.5"
        onSubmit={(e) => {
          e.preventDefault()
          handleAdd()
        }}
      >
        <label className="min-w-[10rem] flex-1 text-xs text-slate-400">
          New team name
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            placeholder="e.g. Team Sur"
            maxLength={80}
          />
        </label>
        <label className="text-xs text-slate-400">
          Color
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="mt-1 block h-9 w-12 cursor-pointer rounded border border-slate-600 bg-slate-900"
            title="Display color"
          />
        </label>
        <Button type="submit" size="sm" variant="gold">
          Add Team
        </Button>
      </form>

      {formError && (
        <InlineAlert tone="error" title="Could not add team">
          {formError}
        </InlineAlert>
      )}

      {teamCount === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-600 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-300">No teams yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Add teams above. Demo score +/- on the Control Panel still applies to
            the roster shown here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {teams.map((team) => {
            const isEditing = editingId === team.id
            return (
              <li
                key={team.id}
                className="rounded-lg border border-slate-700 bg-slate-800/60 p-2.5"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                      maxLength={80}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-600"
                      />
                      <Button size="sm" variant="gold" onClick={saveEdit}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                    {editError && (
                      <p className="text-xs text-red-300">{editError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                          style={{ backgroundColor: team.accent }}
                          aria-hidden
                        />
                        <p className="truncate font-medium text-white">
                          {team.name}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Score (demo):{' '}
                        <span className="tabular-nums text-rose-300">
                          {team.score}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(team)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-300 hover:text-red-200"
                        onClick={() => handleDelete(team)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-[11px] text-slate-500">
        Tournament fields (stages, matches, qualification) are stored on each team
        for Phase 3 — not editable here yet.
      </p>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Button } from '../common/Button.jsx'
import { Badge } from '../common/Badge.jsx'
import { RoundEditorForm } from './RoundEditorForm.jsx'
import { RoundRulesSummary } from './RoundRulesSummary.jsx'
import { getCategoryLabel } from '../../features/rounds/roundHelpers.js'
import { normalizeRound } from '../../features/rounds/roundModel.js'
import { validateRoundDraft } from '../../features/rounds/roundValidation.js'

export function RoundLibraryPanel({
  roundLibrary,
  selectedRoundId,
  onSaveRound,
  onDuplicateRound,
  onDeleteRound,
  onSelectRound,
  onCreateDraft,
  onNotify,
}) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState(null)

  const selectedRound = useMemo(
    () => roundLibrary?.find((r) => r.id === selectedRoundId) ?? null,
    [roundLibrary, selectedRoundId],
  )

  const isNew = draft && !roundLibrary?.some((r) => r.id === draft.id)

  const startCreate = () => {
    const next = onCreateDraft()
    setDraft(next)
    setEditingId('new')
    setErrors(null)
  }

  const startEdit = (round) => {
    setDraft({ ...round })
    setEditingId(round.id)
    setErrors(null)
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditingId(null)
    setErrors(null)
  }

  const handleSave = () => {
    const normalized = normalizeRound(draft)
    const validation = validateRoundDraft(normalized, roundLibrary ?? [])
    if (!validation.valid) {
      setErrors(validation.errors)
      onNotify?.('Fix validation errors before saving.', 'error')
      return
    }
    const result = onSaveRound(normalized)
    if (!result.success) {
      setErrors(result.errors ?? {})
      onNotify?.(result.error ?? 'Could not save round.', 'error')
      return
    }
    onNotify?.(
      result.created ? `Created “${result.round.name}”.` : `Saved “${result.round.name}”.`,
      'success',
    )
    cancelEdit()
  }

  const handleDuplicate = (roundId) => {
    const result = onDuplicateRound(roundId)
    if (!result.success) {
      onNotify?.(result.error, 'error')
      return
    }
    onNotify?.(`Duplicated as “${result.round.name}”.`, 'success')
    startEdit(result.round)
  }

  const handleDelete = (round) => {
    const ok = window.confirm(
      `Delete “${round.name}”?\n\nThis cannot be undone. Tournament selection will be cleared if this round was selected.`,
    )
    if (!ok) return
    const result = onDeleteRound(round.id)
    if (!result.success) {
      onNotify?.(result.error, 'error')
      return
    }
    if (editingId === round.id) cancelEdit()
    onNotify?.(`Deleted “${result.round.name}”.`, 'success')
  }

  const handleSelect = (roundId) => {
    const result = onSelectRound(roundId)
    if (!result.success) {
      onNotify?.(result.error, 'error')
      return
    }
    onNotify?.(`Selected “${result.round.name}” for tournament use.`, 'success')
  }

  const count = roundLibrary?.length ?? 0

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Round library</h2>
            <p className="text-xs text-slate-500">{count} round{count === 1 ? '' : 's'}</p>
          </div>
          <Button size="sm" variant="gold" onClick={startCreate}>
            New Round
          </Button>
        </div>

        {count === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-600 px-4 py-6 text-center text-sm text-slate-400">
            No rounds yet. Create a custom round or duplicate a template after adding one.
          </div>
        ) : (
          <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
            {roundLibrary.map((round) => {
              const isSelected = round.id === selectedRoundId
              const isEditing = editingId === round.id
              return (
                <li
                  key={round.id}
                  className={`rounded-lg border p-2 ${isEditing ? 'border-rose-500/60 bg-slate-800' : 'border-slate-700 bg-slate-800/60'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{round.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {getCategoryLabel(round.category)}
                        {round.isTemplate ? ' · template' : ''}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone={round.active ? 'live' : 'paused'}>
                          {round.active ? 'Active' : 'Inactive'}
                        </Badge>
                        {isSelected && <Badge tone="demo">Selected</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        size="sm"
                        variant={isSelected ? 'secondary' : 'outline'}
                        disabled={!round.active}
                        onClick={() => handleSelect(round.id)}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(round)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleDuplicate(round.id)}>
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-300"
                      onClick={() => handleDelete(round)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2 lg:col-span-7">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {editingId ? (isNew ? 'Create round' : 'Edit round') : 'Selected round summary'}
        </h3>

        {editingId && draft ? (
          <RoundEditorForm
            draft={draft}
            errors={errors}
            onChange={setDraft}
            onSave={handleSave}
            onCancel={cancelEdit}
            saveLabel={isNew ? 'Create Round' : 'Save Changes'}
          />
        ) : (
          <RoundRulesSummary round={selectedRound} selected />
        )}

        {!editingId && !selectedRound && (
          <p className="text-xs text-slate-500">
            Select a round from the library to preview rules for tournament use. Editing is only on this admin page.
          </p>
        )}
      </div>
    </div>
  )
}

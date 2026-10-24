import { Fragment, useMemo, useRef, useState } from 'react'
import {
  MAIN_ROUND_TYPE,
  mainRoundTypeLabel,
  mainTypeNeedsQuestionLibrary,
  syncRulesForMainType,
} from '../../features/rounds/mainRoundType.js'
import { normalizeRound } from '../../features/rounds/roundModel.js'
import { countSelectedQuestions } from '../../features/rounds/roundQuestionModel.js'
import { validateRoundDraft } from '../../features/rounds/roundValidation.js'
import { Button } from '../common/Button.jsx'
import { RoundQuestionEditor } from './RoundQuestionEditor.jsx'

const cellInput =
  'w-full min-w-[5rem] rounded border border-slate-600 bg-slate-950 px-1.5 py-1 text-xs text-white'

export function RoundLibraryWorkspace({
  roundLibrary,
  mediaLibrary,
  onSaveRound,
  onDuplicateRound,
  onDeleteRound,
  onCreateDraft,
  onNotify,
}) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState(null)
  const [questionRoundId, setQuestionRoundId] = useState(null)
  const questionsSnapshotRef = useRef('[]')

  const questionDraft = useMemo(() => {
    if (!questionRoundId) return null
    if (editingId && draft && (questionRoundId === editingId || questionRoundId === draft.id)) {
      return draft
    }
    return roundLibrary?.find((r) => r.id === questionRoundId) ?? null
  }, [questionRoundId, editingId, draft, roundLibrary])

  const startNew = () => {
    const next = onCreateDraft()
    setDraft(next)
    setEditingId('new')
    setErrors(null)
    setQuestionRoundId(null)
  }

  const startEdit = (round) => {
    setDraft({ ...round })
    setEditingId(round.id)
    setErrors(null)
    setQuestionRoundId(round.id)
    questionsSnapshotRef.current = JSON.stringify(round.questions ?? [])
  }

  const openQuestions = (round) => {
    if (!editingId || editingId !== round.id) {
      startEdit(round)
    } else {
      setQuestionRoundId(round.id)
      questionsSnapshotRef.current = JSON.stringify(draft?.questions ?? round.questions ?? [])
    }
  }

  const renderQuestionPanel = (roundKey) => {
    if (questionRoundId !== roundKey || !questionDraft) return null
    if (!mainTypeNeedsQuestionLibrary(questionDraft.mainRoundType)) return null
    const activeDraft = editingId && draft ? draft : questionDraft
    return (
      <tr key={`${roundKey}-questions`} className="border-t border-slate-700 bg-slate-900/50">
        <td colSpan={7} className="px-3 py-3">
          <RoundQuestionEditor
            mainRoundType={activeDraft.mainRoundType}
            questions={activeDraft.questions}
            mediaLibrary={mediaLibrary}
            errors={errors}
            onChange={(questions) => {
              const selected = countSelectedQuestions(questions)
              const base = draft ?? { ...questionDraft }
              const nextDraft = {
                ...base,
                questions,
                rules: { ...base.rules, questionCount: selected },
              }
              setDraft(nextDraft)
              if (!editingId) {
                setEditingId(activeDraft.id)
              }
              persistQuestionsToLibrary(nextDraft)
            }}
          />
        </td>
      </tr>
    )
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditingId(null)
    setErrors(null)
  }

  const persistQuestionsToLibrary = (draftRound) => {
    if (!draftRound?.name?.trim()) return
    const normalized = normalizeRound(draftRound)
    const validation = validateRoundDraft(normalized, roundLibrary ?? [])
    if (!validation.valid) return
    const result = onSaveRound({
      ...normalized,
      name: validation.name ?? normalized.name,
      questions: normalized.questions,
      rules: {
        ...normalized.rules,
        questionCount: countSelectedQuestions(normalized.questions),
      },
    })
    if (result.success) {
      setDraft({ ...result.round })
      questionsSnapshotRef.current = JSON.stringify(result.round.questions ?? [])
    }
  }

  const patchDraft = (patch) => {
    setDraft((d) => {
      const merged = { ...d, ...patch }
      if (patch.mainRoundType) {
        merged.rules = syncRulesForMainType(patch.mainRoundType, merged.rules)
      }
      if (patch.rules?.buzzerEnabled !== undefined && merged.mainRoundType) {
        merged.playType = undefined
      }
      return merged
    })
  }

  const handleSave = () => {
    const normalized = normalizeRound(draft)
    const validation = validateRoundDraft(normalized, roundLibrary ?? [])
    if (!validation.valid) {
      setErrors(validation.errors)
      onNotify?.('Fix validation errors before saving.', 'error')
      return
    }
    const toSave = {
      ...normalized,
      questions: normalized.questions,
      rules: {
        ...normalized.rules,
        questionCount: countSelectedQuestions(normalized.questions) || normalized.rules.questionCount,
      },
    }
    const result = onSaveRound(toSave)
    if (!result.success) {
      setErrors(result.errors ?? {})
      onNotify?.(result.error ?? 'Could not save.', 'error')
      return
    }
    onNotify?.(
      result.created ? `Created “${result.round.name}”.` : `Saved “${result.round.name}”.`,
      'success',
    )
    setEditingId(result.round.id)
    setDraft({ ...result.round })
    setQuestionRoundId(result.round.id)
    setErrors(null)
    questionsSnapshotRef.current = JSON.stringify(result.round.questions ?? [])
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
    const ok = window.confirm(`Delete “${round.name}”?\n\nThis cannot be undone.`)
    if (!ok) return
    const result = onDeleteRound(round.id)
    if (!result.success) {
      onNotify?.(result.error, 'error')
      return
    }
    if (editingId === round.id) cancelEdit()
    if (questionRoundId === round.id) setQuestionRoundId(null)
    onNotify?.(`Deleted “${result.round.name}”.`, 'success')
  }

  const rows = roundLibrary ?? []
  const showEditorRow = editingId === 'new'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          {rows.length} round{rows.length === 1 ? '' : 's'} · Custom names appear on the projector;
          main type controls the question editor.
        </p>
        <Button size="sm" variant="gold" onClick={startNew}>
          New Round
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2">Round name</th>
              <th className="px-2 py-2">Main type</th>
              <th className="px-2 py-2">Buzzer</th>
              <th className="px-2 py-2">Timer</th>
              <th className="px-2 py-2">Score +/−</th>
              <th className="px-2 py-2">Qs</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {showEditorRow && draft && (
              <>
                <RoundEditRow
                  draft={draft}
                  errors={errors}
                  isNew
                  onPatch={patchDraft}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                  onOpenQuestions={() => {
                    setQuestionRoundId('new')
                    questionsSnapshotRef.current = JSON.stringify(draft.questions ?? [])
                  }}
                  questionsOpen={questionRoundId === 'new'}
                />
                {renderQuestionPanel('new')}
              </>
            )}
            {rows.map((round) => {
              const editing = editingId === round.id
              if (editing && draft) {
                return (
                  <Fragment key={round.id}>
                    <RoundEditRow
                      draft={draft}
                      errors={errors}
                      onPatch={patchDraft}
                      onSave={handleSave}
                      onCancel={cancelEdit}
                      onOpenQuestions={() => openQuestions(round)}
                      questionsOpen={questionRoundId === round.id}
                    />
                    {renderQuestionPanel(round.id)}
                  </Fragment>
                )
              }
              return (
                <Fragment key={round.id}>
                <tr className="border-t border-slate-800/80">
                  <td className="px-2 py-2">
                    <p className="font-medium text-white">{round.name}</p>
                    {round.customRule && (
                      <p className="text-[10px] text-slate-500 line-clamp-2">{round.customRule}</p>
                    )}
                  </td>
                  <td className="px-2 py-2">{mainRoundTypeLabel(round.mainRoundType)}</td>
                  <td className="px-2 py-2">{round.rules?.buzzerEnabled ? 'On' : 'Off'}</td>
                  <td className="px-2 py-2">
                    {round.timing?.useTimer ? `${round.timing.timeLimitSeconds}s` : 'Off'}
                  </td>
                  <td className="px-2 py-2">
                    +{round.scoring?.correctPoints} / −{round.scoring?.wrongPenalty}
                  </td>
                  <td className="px-2 py-2">
                    {mainTypeNeedsQuestionLibrary(round.mainRoundType)
                      ? `${countSelectedQuestions(round.questions)}/${round.questions?.length ?? 0}`
                      : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(round)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={questionRoundId === round.id ? 'secondary' : 'outline'}
                        onClick={() => openQuestions(round)}
                      >
                        Questions
                      </Button>
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
                  </td>
                </tr>
                {renderQuestionPanel(round.id)}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RoundEditRow({
  draft,
  errors,
  isNew,
  onPatch,
  onSave,
  onCancel,
  onOpenQuestions,
  questionsOpen,
}) {
  const main = draft.mainRoundType ?? MAIN_ROUND_TYPE.WORD
  return (
    <tr className="border-t border-amber-500/30 bg-slate-800/80">
      <td className="px-2 py-2 align-top">
        <input
          className={cellInput}
          value={draft.name ?? ''}
          placeholder="Custom round name"
          onChange={(e) => onPatch({ name: e.target.value })}
        />
        {errors?.name && <p className="text-[10px] text-red-300">{errors.name}</p>}
        <textarea
          className={`${cellInput} mt-1 min-h-[2rem]`}
          placeholder="Round rule (e.g. word must appear twice in mukhda)"
          value={draft.customRule ?? ''}
          onChange={(e) => onPatch({ customRule: e.target.value })}
        />
        <textarea
          className={`${cellInput} mt-1 min-h-[2rem]`}
          placeholder="Anchor instructions"
          value={draft.instructions ?? ''}
          onChange={(e) => onPatch({ instructions: e.target.value })}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <select
          className={cellInput}
          value={main}
          onChange={(e) => onPatch({ mainRoundType: e.target.value })}
        >
          {Object.values(MAIN_ROUND_TYPE).map((id) => (
            <option key={id} value={id}>{mainRoundTypeLabel(id)}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 align-top">
        <label className="flex items-center gap-1 text-[11px]">
          <input
            type="checkbox"
            checked={Boolean(draft.rules?.buzzerEnabled)}
            disabled={main === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI}
            onChange={(e) =>
              onPatch({ rules: { ...draft.rules, buzzerEnabled: e.target.checked } })
            }
          />
          On
        </label>
      </td>
      <td className="px-2 py-2 align-top">
        <label className="flex items-center gap-1 text-[11px]">
          <input
            type="checkbox"
            checked={Boolean(draft.timing?.useTimer)}
            onChange={(e) =>
              onPatch({
                timing: {
                  ...draft.timing,
                  useTimer: e.target.checked,
                  timeLimitSeconds: draft.timing?.timeLimitSeconds ?? 30,
                },
              })
            }
          />
          On
        </label>
        {draft.timing?.useTimer && (
          <input
            type="number"
            min={1}
            className={`${cellInput} mt-1`}
            value={draft.timing?.timeLimitSeconds ?? 30}
            onChange={(e) =>
              onPatch({
                timing: { ...draft.timing, timeLimitSeconds: Number(e.target.value) },
              })
            }
          />
        )}
      </td>
      <td className="px-2 py-2 align-top">
        <input
          type="number"
          className={cellInput}
          value={draft.scoring?.correctPoints ?? 0}
          onChange={(e) =>
            onPatch({ scoring: { ...draft.scoring, correctPoints: Number(e.target.value) } })
          }
        />
        <input
          type="number"
          className={`${cellInput} mt-1`}
          value={draft.scoring?.wrongPenalty ?? 0}
          onChange={(e) =>
            onPatch({ scoring: { ...draft.scoring, wrongPenalty: Number(e.target.value) } })
          }
        />
      </td>
      <td className="px-2 py-2 align-top">
        {mainTypeNeedsQuestionLibrary(main) ? (
          <input
            type="number"
            min={1}
            className={cellInput}
            value={countSelectedQuestions(draft.questions) || 0}
            readOnly
            title="Selected questions (set via checkboxes in the question library)"
          />
        ) : (
          <span className="text-slate-500">N/A</span>
        )}
      </td>
      <td className="px-2 py-2 align-top">
        <div className="flex flex-col gap-1">
          <Button size="sm" variant="gold" onClick={onSave}>
            {isNew ? 'Create' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          {mainTypeNeedsQuestionLibrary(main) && (
            <Button size="sm" variant={questionsOpen ? 'secondary' : 'outline'} onClick={onOpenQuestions}>
              Questions
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

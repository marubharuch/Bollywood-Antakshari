import { useCallback, useMemo, useState } from 'react'
import { MAIN_ROUND_TYPE, mainRoundTypeLabel } from '../../features/rounds/mainRoundType.js'
import {
  countSelectedQuestions,
  createEmptyQuestionForMainType,
  normalizeRoundQuestion,
  questionSummaryLabel,
  validateRoundQuestion,
} from '../../features/rounds/roundQuestionModel.js'
import { formatMediaTime } from '../../utils/mediaTime.js'
import { Button } from '../common/Button.jsx'
import { QuestionEditModal } from './QuestionEditModal.jsx'
import { QuestionImagePreview } from './QuestionImagePreview.jsx'
import { QuestionMediaSegmentEditor } from './QuestionMediaSegmentEditor.jsx'

const inputClass =
  'mt-0.5 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white'

function filterMediaByMainType(mediaLibrary, mainRoundType) {
  return (mediaLibrary ?? []).filter((m) => {
    if (mainRoundType === MAIN_ROUND_TYPE.AUDIO) return m.mediaType === 'audio'
    if (mainRoundType === MAIN_ROUND_TYPE.VIDEO) return m.mediaType === 'video'
    return m.mediaType === 'image'
  })
}

export function QuestionFormFields({
  mainRoundType,
  nq,
  mediaItem,
  mediaOptions,
  errors,
  onPatch,
}) {
  const needsSegment =
    mainRoundType === MAIN_ROUND_TYPE.AUDIO || mainRoundType === MAIN_ROUND_TYPE.VIDEO

  return (
    <>
      {mainRoundType === MAIN_ROUND_TYPE.WORD && (
        <>
          <label className="block text-[11px] text-slate-400">
            Word / phrase
            <input
              className={inputClass}
              value={nq.word}
              onChange={(e) => onPatch({ word: e.target.value })}
            />
            {errors?.word && <span className="text-red-300">{errors.word}</span>}
          </label>
          <label className="mt-1 block text-[11px] text-slate-400">
            Song reference (title / year — anchor only)
            <input
              className={inputClass}
              value={nq.clue}
              onChange={(e) => onPatch({ clue: e.target.value })}
              placeholder="e.g. Dil Se (1998)"
            />
          </label>
        </>
      )}

      {mainRoundType === MAIN_ROUND_TYPE.MULTI_WORD &&
        nq.words.map((w, wi) => (
          <label key={wi} className="mt-1 block text-[11px] text-slate-400">
            Word {wi + 1}
            <input
              className={inputClass}
              value={w}
              onChange={(e) => {
                const words = [...nq.words]
                words[wi] = e.target.value
                onPatch({ words })
              }}
            />
          </label>
        ))}
      {mainRoundType === MAIN_ROUND_TYPE.MULTI_WORD && errors?.words && (
        <span className="text-red-300">{errors.words}</span>
      )}

      {(mainRoundType === MAIN_ROUND_TYPE.AUDIO ||
        mainRoundType === MAIN_ROUND_TYPE.VIDEO ||
        mainRoundType === MAIN_ROUND_TYPE.IMAGE) && (
        <label className="block text-[11px] text-slate-400">
          Media asset
          <select
            className={inputClass}
            value={nq.mediaId ?? ''}
            onChange={(e) =>
              onPatch({
                mediaId: e.target.value || null,
                segmentStartSeconds: null,
                segmentEndSeconds: null,
              })
            }
          >
            <option value="">Select from library…</option>
            {(mediaOptions ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayTitle || m.originalFileName}
              </option>
            ))}
          </select>
          {errors?.media && <span className="text-red-300">{errors.media}</span>}
        </label>
      )}

      {mainRoundType === MAIN_ROUND_TYPE.IMAGE && (
        <>
          <QuestionImagePreview mediaItem={mediaItem} />
          <label className="mt-1 block text-[11px] text-slate-400">
            Optional clue / word on projector
            <input
              className={inputClass}
              value={nq.clue}
              onChange={(e) => onPatch({ clue: e.target.value })}
            />
          </label>
        </>
      )}

      {needsSegment && mediaItem && (
        <>
          {mainRoundType === MAIN_ROUND_TYPE.VIDEO && (
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                className="rounded border-slate-600"
                checked={Boolean(nq.videoStartMuted)}
                onChange={(e) => onPatch({ videoStartMuted: e.target.checked })}
              />
              Start with Mute
            </label>
          )}
          <QuestionMediaSegmentEditor
            mediaItem={mediaItem}
            mediaType={mainRoundType === MAIN_ROUND_TYPE.VIDEO ? 'video' : 'audio'}
            segmentStartSeconds={nq.segmentStartSeconds}
            segmentEndSeconds={nq.segmentEndSeconds}
            videoStartMuted={mainRoundType === MAIN_ROUND_TYPE.VIDEO ? Boolean(nq.videoStartMuted) : false}
            onSegmentChange={(patch) => onPatch(patch)}
            errorMessage={errors?.segment ?? null}
          />
        </>
      )}

      <label className="mt-1 block text-[11px] text-slate-400">
        Anchor notes
        <textarea
          className={`${inputClass} min-h-[2.5rem]`}
          value={nq.anchorNotes}
          onChange={(e) => onPatch({ anchorNotes: e.target.value })}
        />
      </label>

      <label className="mt-1 block text-[11px] text-slate-400">
        Accepted answer / reference (optional)
        <input
          className={inputClass}
          value={nq.acceptedAnswer}
          onChange={(e) => onPatch({ acceptedAnswer: e.target.value })}
        />
      </label>
    </>
  )
}

function questionSnapshot(q) {
  return JSON.stringify(normalizeRoundQuestion(q))
}

export function RoundQuestionEditor(props) {
  if (props.mainRoundType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    return (
      <p className="text-xs text-slate-500">
        {mainRoundTypeLabel(props.mainRoundType)} rounds do not use individual question records.
      </p>
    )
  }
  return <RoundQuestionLibraryBody {...props} />
}

function RoundQuestionLibraryBody({
  mainRoundType,
  questions,
  mediaLibrary,
  errors: roundErrors,
  onChange,
}) {
  const list = useMemo(
    () => (Array.isArray(questions) ? questions.map((q, i) => normalizeRoundQuestion(q, i)) : []),
    [questions],
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [isNewQuestion, setIsNewQuestion] = useState(true)
  const [editBuffer, setEditBuffer] = useState(null)
  const [initialSnapshot, setInitialSnapshot] = useState('')
  const [fieldErrors, setFieldErrors] = useState(null)
  const [saveMessage, setSaveMessage] = useState(null)

  const selectedCount = countSelectedQuestions(list)
  const savedCount = list.length

  const filteredMedia = useMemo(
    () => filterMediaByMainType(mediaLibrary, mainRoundType),
    [mainRoundType, mediaLibrary],
  )

  const typeLabel = mainRoundTypeLabel(mainRoundType)
  const modalTitle = `${isNewQuestion ? 'Add' : 'Edit'} ${typeLabel} Question`

  const openAddModal = useCallback(() => {
    const q = createEmptyQuestionForMainType(mainRoundType)
    setEditBuffer(q)
    setInitialSnapshot(questionSnapshot(q))
    setIsNewQuestion(true)
    setFieldErrors(null)
    setSaveMessage(null)
    setModalOpen(true)
  }, [mainRoundType])

  const openEditModal = useCallback((q) => {
    const normalized = normalizeRoundQuestion(q)
    setEditBuffer(normalized)
    setInitialSnapshot(questionSnapshot(normalized))
    setIsNewQuestion(false)
    setFieldErrors(null)
    setSaveMessage(null)
    setModalOpen(true)
  }, [])

  const isDirty = useMemo(() => {
    if (!editBuffer) return false
    return questionSnapshot(editBuffer) !== initialSnapshot
  }, [editBuffer, initialSnapshot])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditBuffer(null)
    setFieldErrors(null)
    setSaveMessage(null)
  }, [])

  const requestCloseModal = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('Discard unsaved changes to this question?')
      if (!ok) return
    }
    closeModal()
  }, [isDirty, closeModal])

  const persistList = (nextList) => {
    const normalized = nextList.map((q, i) => normalizeRoundQuestion({ ...q, sortOrder: i }, i))
    onChange(normalized)
  }

  const commitCurrentQuestion = (mode) => {
    if (!editBuffer) return false
    const existingIndex = list.findIndex((q) => q.id === editBuffer.id)
    const label =
      existingIndex >= 0 ? `Question ${existingIndex + 1}` : `Question ${list.length + 1}`
    const normalized = normalizeRoundQuestion(editBuffer)
    const result = validateRoundQuestion(normalized, mainRoundType, label)
    if (!result.valid) {
      setFieldErrors(result.errors)
      setSaveMessage(result.firstError)
      return false
    }
    setFieldErrors(null)
    setSaveMessage(null)
    const idx = list.findIndex((q) => q.id === normalized.id)
    let merged = normalized
    if (idx >= 0) {
      merged = normalizeRoundQuestion({
        ...normalized,
        selectedForRound: list[idx].selectedForRound,
        sortOrder: list[idx].sortOrder,
      })
    }
    const next =
      idx >= 0 ? list.map((q, i) => (i === idx ? merged : q)) : [...list, merged]
    persistList(next)
    if (mode === 'addNew') {
      const q = createEmptyQuestionForMainType(mainRoundType)
      setEditBuffer(q)
      setInitialSnapshot(questionSnapshot(q))
      setIsNewQuestion(true)
      setFieldErrors(null)
      setSaveMessage(null)
    } else {
      closeModal()
    }
    return true
  }

  const toggleSelected = (id, checked) => {
    persistList(list.map((q) => (q.id === id ? { ...q, selectedForRound: checked } : q)))
  }

  const removeQuestion = (q, displayNum) => {
    const ok = window.confirm(`Remove saved question ${displayNum}? This cannot be undone.`)
    if (!ok) return
    persistList(list.filter((item) => item.id !== q.id))
  }

  const moveInList = (index, dir) => {
    const j = index + dir
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[index], next[j]] = [next[j], next[index]]
    persistList(next)
  }

  const buffer = editBuffer ? normalizeRoundQuestion(editBuffer) : null
  const bufferMedia =
    buffer?.mediaId ? mediaLibrary?.find((m) => m.id === buffer.mediaId) ?? null : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-300">
          <p className="font-semibold">
            Questions selected for this round:{' '}
            <span className="text-amber-200">{selectedCount}</span>
          </p>
          <p className="text-[11px] text-slate-500">
            {selectedCount} selected for this round · {savedCount} saved question
            {savedCount === 1 ? '' : 's'} · {typeLabel}
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={modalOpen} onClick={openAddModal}>
          Add question
        </Button>
      </div>

      <ul
        className="max-h-[14rem] space-y-1 overflow-y-auto overflow-x-hidden pr-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {list.length === 0 && (
          <li className="text-[11px] text-slate-500">No saved questions yet. Use Add question.</li>
        )}
        {list.map((q, index) => {
          const mediaItem = q.mediaId ? mediaLibrary?.find((m) => m.id === q.mediaId) ?? null : null
          const summary = questionSummaryLabel(q, mainRoundType, mediaItem)
          const segmentHint =
            (mainRoundType === MAIN_ROUND_TYPE.AUDIO || mainRoundType === MAIN_ROUND_TYPE.VIDEO) &&
            q.segmentStartSeconds != null &&
            q.segmentEndSeconds != null
              ? `${formatMediaTime(q.segmentStartSeconds)}–${formatMediaTime(q.segmentEndSeconds)}`
              : null

          return (
            <li
              key={q.id}
              className="flex flex-wrap items-center gap-2 rounded border border-slate-700 bg-slate-900/40 px-2 py-1.5 text-[11px]"
            >
              <input
                type="checkbox"
                className="shrink-0"
                checked={q.selectedForRound}
                title="Include in this round"
                onChange={(e) => toggleSelected(q.id, e.target.checked)}
              />
              <span className="w-6 shrink-0 font-medium text-slate-400">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-slate-200" title={summary}>
                {summary}
                {segmentHint && (
                  <span className="ml-1 text-slate-500">({segmentHint})</span>
                )}
              </span>
              <div className="flex shrink-0 flex-wrap gap-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0 || modalOpen}
                  onClick={() => moveInList(index, -1)}
                  aria-label="Move up"
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === list.length - 1 || modalOpen}
                  onClick={() => moveInList(index, 1)}
                  aria-label="Move down"
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={modalOpen}
                  onClick={() => openEditModal(q)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-300"
                  disabled={modalOpen}
                  onClick={() => removeQuestion(q, index + 1)}
                >
                  Remove
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      {roundErrors?.questionCount && (
        <p className="text-xs text-red-300">{roundErrors.questionCount}</p>
      )}

      <QuestionEditModal
        open={modalOpen && Boolean(buffer)}
        title={modalTitle}
        onRequestClose={requestCloseModal}
        errorBanner={saveMessage}
        footer={
          <>
            <Button size="sm" variant="gold" onClick={() => commitCurrentQuestion('addNew')}>
              Save &amp; Add New
            </Button>
            <Button size="sm" variant="secondary" onClick={() => commitCurrentQuestion('finish')}>
              Save &amp; Finish
            </Button>
            <Button size="sm" variant="ghost" onClick={requestCloseModal}>
              Cancel
            </Button>
          </>
        }
      >
        {buffer && (
          <QuestionFormFields
            mainRoundType={mainRoundType}
            nq={buffer}
            mediaItem={bufferMedia}
            errors={fieldErrors}
            mediaOptions={filteredMedia}
            onPatch={(patch) =>
              setEditBuffer((prev) => normalizeRoundQuestion({ ...prev, ...patch }))
            }
          />
        )}
      </QuestionEditModal>
    </div>
  )
}

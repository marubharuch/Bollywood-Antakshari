import { useCallback, useMemo, useState } from 'react'
import { MAIN_ROUND_TYPE, mainRoundTypeLabel } from '../../features/rounds/mainRoundType.js'
import { questionFormatLabel } from '../../features/questionLibrary/questionFormatModel.js'
import { filterLibraryForRound } from '../../features/questionLibrary/libraryQuestionCompat.js'
import {
  createLibraryQuestionId,
  libraryQuestionFromRoundQuestion,
  libraryQuestionToRoundQuestion,
  normalizeLibraryQuestion,
} from '../../features/questionLibrary/questionLibraryModel.js'
import { questionTypeFromMainRoundType } from '../../features/questionLibrary/questionFormatModel.js'
import { normalizeRound } from '../../features/rounds/roundModel.js'
import { validateRoundQuestion } from '../../features/rounds/roundQuestionModel.js'
import { QuestionLibraryFormatTable } from './QuestionLibraryFormatTable.jsx'
import { QuestionEditModal } from '../rounds/QuestionEditModal.jsx'
import { QuestionFormFields } from '../rounds/RoundQuestionEditor.jsx'
import { normalizeRoundQuestion } from '../../features/rounds/roundQuestionModel.js'
import { Button } from '../common/Button.jsx'
export function RoundQuestionAssignmentPanel({
  round,
  questionLibrary,
  mediaLibrary,
  onAssignmentChange,
  onUpsertLibraryQuestion,
  onPreviewMedia,
  onNotify,
}) {
  const normalizedRound = useMemo(() => normalizeRound(round), [round])
  const mainRoundType = normalizedRound.mainRoundType
  const compatible = useMemo(
    () => filterLibraryForRound(normalizedRound, questionLibrary),
    [normalizedRound, questionLibrary],
  )

  const assignmentIds = normalizedRound.assignmentQuestionIds ?? []

  const [modalOpen, setModalOpen] = useState(false)
  const [editLibraryId, setEditLibraryId] = useState(null)
  const [editBuffer, setEditBuffer] = useState(null)
  const [fieldErrors, setFieldErrors] = useState(null)

  const openNew = useCallback(() => {
    const q = normalizeLibraryQuestion({
      id: createLibraryQuestionId(),
      questionType: questionTypeFromMainRoundType(mainRoundType),
      questionFormat: normalizedRound.questionFormat,
      isActive: true,
    })
    setEditLibraryId(null)
    setEditBuffer(libraryQuestionToRoundQuestion(q))
    setFieldErrors(null)
    setModalOpen(true)
  }, [mainRoundType, normalizedRound.questionFormat])

  const openEdit = useCallback((libraryQuestion) => {
    setEditLibraryId(libraryQuestion.id)
    setEditBuffer(libraryQuestionToRoundQuestion(libraryQuestion))
    setFieldErrors(null)
    setModalOpen(true)
  }, [])

  const commitEdit = useCallback(() => {
    if (!editBuffer) return
    const rq = normalizeRoundQuestion(editBuffer)
    const label = editLibraryId ? 'Question' : 'New question'
    const result = validateRoundQuestion(rq, mainRoundType, label)
    if (!result.valid) {
      setFieldErrors(result.errors)
      return
    }
    const prior = editLibraryId
      ? normalizeLibraryQuestion(questionLibrary.find((q) => q.id === editLibraryId))
      : null
    const canonical = libraryQuestionFromRoundQuestion(rq, normalizedRound)
    const merged = normalizeLibraryQuestion({
      ...(prior ?? {}),
      ...canonical,
      id: editLibraryId ?? canonical.id,
      title:
        (rq.word ?? '').trim() ||
        (rq.words ?? []).map((w) => (w ?? '').trim()).filter(Boolean).join(' · ') ||
        (rq.clue ?? '').trim() ||
        prior?.title ||
        canonical.title,
      updatedAt: Date.now(),
    })
    onUpsertLibraryQuestion(merged)
    if (!editLibraryId) {
      onAssignmentChange([...assignmentIds, merged.id])
    }
    setModalOpen(false)
    setEditBuffer(null)
    onNotify?.('Question saved to library.', 'success')
  }, [
    editBuffer,
    editLibraryId,
    mainRoundType,
    normalizedRound,
    questionLibrary,
    assignmentIds,
    onUpsertLibraryQuestion,
    onAssignmentChange,
    onNotify,
  ])

  const handlePreviewMedia = useCallback(
    (q, mediaItem) => {
      onPreviewMedia?.(q, mediaItem)
    },
    [onPreviewMedia],
  )

  if (mainRoundType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    return (
      <p className="text-xs text-slate-500">
        {mainRoundTypeLabel(mainRoundType)} rounds do not use the question library.
      </p>
    )
  }

  const buffer = editBuffer ? normalizeRoundQuestion(editBuffer) : null
  const bufferMedia =
    buffer?.mediaId ? mediaLibrary?.find((m) => m.id === buffer.mediaId) ?? null : null
  const mediaOptions = (mediaLibrary ?? []).filter((m) => {
    if (mainRoundType === MAIN_ROUND_TYPE.AUDIO) return m.mediaType === 'audio'
    if (mainRoundType === MAIN_ROUND_TYPE.VIDEO) return m.mediaType === 'video'
    if (mainRoundType === MAIN_ROUND_TYPE.IMAGE) return m.mediaType === 'image'
    return false
  })

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400">
        Round: <span className="text-slate-200">{normalizedRound.name}</span> · Main type:{' '}
        <span className="text-slate-200">{mainRoundTypeLabel(mainRoundType)}</span> · Format:{' '}
        <span className="text-slate-200">{questionFormatLabel(normalizedRound.questionFormat)}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" type="button" onClick={openNew}>
          Add library question
        </Button>
      </div>
      <QuestionLibraryFormatTable
        mainRoundType={mainRoundType}
        questions={compatible}
        mediaLibrary={mediaLibrary}
        assignmentIds={assignmentIds}
        onAssignmentChange={onAssignmentChange}
        onEdit={openEdit}
        onPreviewMedia={handlePreviewMedia}
      />
      <QuestionEditModal
        open={modalOpen && Boolean(buffer)}
        title={editLibraryId ? 'Edit library question' : 'Add library question'}
        onRequestClose={() => setModalOpen(false)}
        errorBanner={fieldErrors ? Object.values(fieldErrors)[0] : null}
        footer={
          <>
            <Button size="sm" variant="gold" type="button" onClick={commitEdit}>
              Save to library
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setModalOpen(false)}>
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
            mediaOptions={mediaOptions}
            errors={fieldErrors}
            onPatch={(patch) => setEditBuffer((prev) => ({ ...prev, ...patch }))}
          />
        )}
      </QuestionEditModal>
    </div>
  )
}

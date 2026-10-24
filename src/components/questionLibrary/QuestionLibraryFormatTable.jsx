import { useMemo, useState } from 'react'
import { MAIN_ROUND_TYPE } from '../../features/rounds/mainRoundType.js'
import { questionFormatLabel } from '../../features/questionLibrary/questionFormatModel.js'
import { normalizeLibraryQuestion } from '../../features/questionLibrary/questionLibraryModel.js'
import { formatMediaTime } from '../../utils/mediaTime.js'
import { Button } from '../common/Button.jsx'
import { QuestionImagePreview } from '../rounds/QuestionImagePreview.jsx'

function matchesSearch(q, term) {
  if (!term) return true
  const t = term.toLowerCase()
  const hay = [
    q.id,
    q.title,
    q.questionText,
    q.answer,
    q.instructions,
    q.typePayload?.word,
    ...(q.typePayload?.words ?? []),
    q.typePayload?.clue,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(t)
}

export function QuestionLibraryFormatTable({
  mainRoundType,
  questions,
  mediaLibrary,
  assignmentIds,
  onAssignmentChange,
  onEdit,
  onPreviewMedia,
}) {
  const [search, setSearch] = useState('')
  const assignedSet = useMemo(() => new Set(assignmentIds ?? []), [assignmentIds])
  const orderedAssigned = assignmentIds ?? []

  const rows = useMemo(() => {
    return (questions ?? [])
      .map((raw) => normalizeLibraryQuestion(raw))
      .filter((q) => q && q.isActive !== false && matchesSearch(q, search.trim()))
  }, [questions, search])

  const allFilteredIds = rows.map((r) => r.id)
  const allFilteredSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => assignedSet.has(id))

  const toggleOne = (id, checked) => {
    if (checked) {
      if (!orderedAssigned.includes(id)) onAssignmentChange([...orderedAssigned, id])
      return
    }
    onAssignmentChange(orderedAssigned.filter((x) => x !== id))
  }

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const remove = new Set(allFilteredIds)
      onAssignmentChange(orderedAssigned.filter((id) => !remove.has(id)))
      return
    }
    const set = new Set(orderedAssigned)
    const next = [...orderedAssigned]
    for (const id of allFilteredIds) {
      if (!set.has(id)) next.push(id)
    }
    onAssignmentChange(next)
  }

  const moveAssigned = (id, dir) => {
    const idx = orderedAssigned.indexOf(id)
    if (idx < 0) return
    const j = idx + dir
    if (j < 0 || j >= orderedAssigned.length) return
    const next = [...orderedAssigned]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onAssignmentChange(next)
  }

  const isWord =
    mainRoundType === MAIN_ROUND_TYPE.WORD || mainRoundType === MAIN_ROUND_TYPE.MULTI_WORD
  const isAudio = mainRoundType === MAIN_ROUND_TYPE.AUDIO
  const isVideo = mainRoundType === MAIN_ROUND_TYPE.VIDEO
  const isImage = mainRoundType === MAIN_ROUND_TYPE.IMAGE

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search questions…"
          className="min-w-[12rem] flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-amber-200">
          Selected: <strong>{orderedAssigned.length}</strong>
          {search.trim() ? (
            <span className="text-slate-500"> · {rows.length} shown</span>
          ) : null}
        </span>
        <Button size="sm" variant="outline" type="button" onClick={toggleAllFiltered}>
          {allFilteredSelected ? 'Deselect filtered' : 'Select all filtered'}
        </Button>
      </div>

      <div className="max-h-[min(24rem,50vh)] overflow-auto rounded border border-slate-700">
        <table className="min-w-full text-left text-[11px] text-slate-300">
          <thead className="sticky top-0 z-10 bg-slate-900/95 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5 w-8" />
              <th className="px-2 py-1.5">ID</th>
              <th className="px-2 py-1.5">Title / text</th>
              <th className="px-2 py-1.5">Format</th>
              {isWord && <th className="px-2 py-1.5">Word(s)</th>}
              {(isAudio || isVideo) && <th className="px-2 py-1.5">Clip</th>}
              {(isAudio || isVideo || isImage) && <th className="px-2 py-1.5">Media</th>}
              <th className="px-2 py-1.5">Answer</th>
              <th className="px-2 py-1.5">Pts</th>
              <th className="px-2 py-1.5">Order</th>
              <th className="px-2 py-1.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-2 py-4 text-center text-slate-500">
                  No compatible questions. Add one or adjust filters.
                </td>
              </tr>
            )}
            {rows.map((q) => {
              const mediaItem = q.media?.mediaId
                ? mediaLibrary?.find((m) => m.id === q.media.mediaId) ?? null
                : null
              const hasMedia = Boolean(mediaItem?.offlineReady || mediaItem?.externalUrl)
              const seg =
                q.media?.segmentStartSeconds != null && q.media?.segmentEndSeconds != null
                  ? `${formatMediaTime(q.media.segmentStartSeconds)}–${formatMediaTime(q.media.segmentEndSeconds)}`
                  : '—'
              const inOrder = orderedAssigned.includes(q.id)
              const orderIdx = orderedAssigned.indexOf(q.id)

              return (
                <tr key={q.id} className="border-t border-slate-800/80">
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={assignedSet.has(q.id)}
                      onChange={(e) => toggleOne(q.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-slate-400">{q.id}</td>
                  <td className="px-2 py-1.5 max-w-[10rem]">
                    <p className="font-medium text-slate-100 truncate" title={q.title}>
                      {q.title || '—'}
                    </p>
                    {q.questionText && (
                      <p className="truncate text-slate-500" title={q.questionText}>
                        {q.questionText}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{questionFormatLabel(q.questionFormat)}</td>
                  {isWord && (
                    <td className="px-2 py-1.5">
                      {mainRoundType === MAIN_ROUND_TYPE.MULTI_WORD
                        ? (q.typePayload?.words ?? []).filter((w) => (w ?? '').trim()).join(' · ') ||
                          '—'
                        : q.typePayload?.word || '—'}
                    </td>
                  )}
                  {(isAudio || isVideo) && <td className="px-2 py-1.5">{seg}</td>}
                  {(isAudio || isVideo || isImage) && (
                    <td className="px-2 py-1.5">
                      {hasMedia ? (
                        <span className="text-emerald-300">Ready</span>
                      ) : q.media?.mediaId ? (
                        <span className="text-amber-300">Missing file</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                      {isImage && mediaItem && (
                        <div className="mt-1 max-w-[4rem]">
                          <QuestionImagePreview mediaItem={mediaItem} />
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-2 py-1.5 max-w-[8rem] truncate" title={q.answer}>
                    {q.answer ? '✓' : '—'}
                  </td>
                  <td className="px-2 py-1.5">{q.defaultPoints ?? '—'}</td>
                  <td className="px-2 py-1.5">
                    {inOrder ? (
                      <span className="tabular-nums text-amber-200">{orderIdx + 1}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-wrap gap-0.5">
                      {inOrder && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => moveAssigned(q.id, -1)}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => moveAssigned(q.id, 1)}
                          >
                            ↓
                          </Button>
                        </>
                      )}
                      {(isAudio || isVideo) && mediaItem && (
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => onPreviewMedia?.(q, mediaItem)}
                        >
                          Preview
                        </Button>
                      )}
                      <Button size="sm" variant="outline" type="button" onClick={() => onEdit(q)}>
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

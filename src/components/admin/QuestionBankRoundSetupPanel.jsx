import { useMemo } from 'react'
import { Button } from '../common/Button.jsx'
import { InlineAlert } from '../common/InlineAlert.jsx'
import {
  QUESTION_BANK_PICK_MODE,
  getQuestionBank,
  questionBankEntryCount,
} from '../../features/questionBank/questionBankModel.js'
import { resolveQuestionBankId } from '../../features/questionBank/questionBankRound.js'
import { normalizeRound } from '../../features/rounds/roundModel.js'

export function QuestionBankRoundSetupPanel({
  profileSlots,
  roundLibrary,
  selections,
  onPatchSelection,
  onSyncStageQuestionCount,
  disabled,
}) {
  const bankSlots = useMemo(() => {
    const libById = new Map((roundLibrary ?? []).map((r) => [r.id, normalizeRound(r)]))
    return (profileSlots ?? [])
      .map((slot) => {
        const round = libById.get(slot.libraryRoundId)
        const bankId = round ? resolveQuestionBankId(round) : null
        if (!bankId) return null
        return {
          slot,
          round,
          bankId,
          bankSize: questionBankEntryCount(bankId),
          bankEntries: getQuestionBank(bankId),
        }
      })
      .filter(Boolean)
  }, [profileSlots, roundLibrary])

  if (!bankSlots.length) return null

  return (
    <div className="rounded-lg border border-violet-500/30 bg-slate-900/50 p-3 mb-3">
      <h3 className="text-sm font-semibold text-violet-100">Question library setup</h3>
      <p className="mt-1 text-[11px] text-slate-400">
        Choose how many mukhda words to use for this tournament session. Selection is saved per
        tournament and flows into the existing round snapshot on Save &amp; validate — live play
        rules are unchanged.
      </p>

      <ul className="mt-3 space-y-4">
        {bankSlots.map(({ slot, round, bankId, bankSize, bankEntries }) => {
          const sel = selections?.[slot.libraryRoundId] ?? {}
          const useCount = Math.min(
            bankSize,
            Math.max(1, Number(sel.useCount) || slot.questionCount || 10),
          )
          const pickMode = sel.pickMode === QUESTION_BANK_PICK_MODE.MANUAL
            ? QUESTION_BANK_PICK_MODE.MANUAL
            : QUESTION_BANK_PICK_MODE.RANDOM
          const selectedIds = new Set(
            Array.isArray(sel.entryIds) ? sel.entryIds.map((n) => Number(n)) : [],
          )

          const patch = (partial) => {
            onPatchSelection(slot.libraryRoundId, {
              bankId,
              useCount,
              pickMode,
              entryIds: [...selectedIds],
              ...partial,
            })
          }

          const manualReady =
            pickMode !== QUESTION_BANK_PICK_MODE.MANUAL || selectedIds.size >= useCount

          return (
            <li
              key={slot.id}
              className="rounded border border-slate-600/80 bg-slate-950/40 p-2 text-sm"
            >
              <p className="font-medium text-slate-100">{round.name}</p>
              <p className="text-[11px] text-slate-500">
                Available questions in library:{' '}
                <strong className="text-violet-200">{bankSize}</strong>
              </p>

              <label className="mt-2 block text-xs text-slate-400">
                How many words to use this session ({useCount})
                <input
                  type="range"
                  min={1}
                  max={bankSize}
                  disabled={disabled}
                  value={useCount}
                  className="mt-1 w-full accent-violet-500"
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    patch({ useCount: next })
                    onSyncStageQuestionCount?.(slot.id, next)
                  }}
                />
              </label>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="number"
                  min={1}
                  max={bankSize}
                  disabled={disabled}
                  className="w-16 rounded border border-slate-600 bg-slate-950 px-1 py-0.5"
                  value={useCount}
                  onChange={(e) => {
                    const next = Math.min(
                      bankSize,
                      Math.max(1, Math.floor(Number(e.target.value)) || 1),
                    )
                    patch({ useCount: next })
                    onSyncStageQuestionCount?.(slot.id, next)
                  }}
                />
                <span>of {bankSize}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={pickMode === QUESTION_BANK_PICK_MODE.RANDOM ? 'primary' : 'outline'}
                  pressed={pickMode === QUESTION_BANK_PICK_MODE.RANDOM}
                  disabled={disabled}
                  onClick={() => patch({ pickMode: QUESTION_BANK_PICK_MODE.RANDOM })}
                >
                  Random pick
                </Button>
                <Button
                  size="sm"
                  variant={pickMode === QUESTION_BANK_PICK_MODE.MANUAL ? 'primary' : 'outline'}
                  pressed={pickMode === QUESTION_BANK_PICK_MODE.MANUAL}
                  disabled={disabled}
                  onClick={() => patch({ pickMode: QUESTION_BANK_PICK_MODE.MANUAL })}
                >
                  Pick manually
                </Button>
              </div>

              {pickMode === QUESTION_BANK_PICK_MODE.MANUAL && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded border border-slate-700/80 p-1">
                  <p className="mb-1 text-[10px] text-slate-500">
                    Select {useCount} word(s) — {selectedIds.size} chosen
                  </p>
                  <ul className="space-y-0.5">
                    {bankEntries.map((entry) => {
                      const checked = selectedIds.has(entry.id)
                      return (
                        <li key={entry.id}>
                          <label className="flex cursor-pointer items-start gap-2 text-[11px] text-slate-300">
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={checked}
                              onChange={() => {
                                const next = new Set(selectedIds)
                                if (checked) next.delete(entry.id)
                                else if (next.size < useCount) next.add(entry.id)
                                patch({
                                  pickMode: QUESTION_BANK_PICK_MODE.MANUAL,
                                  entryIds: [...next],
                                })
                              }}
                            />
                            <span>
                              <strong className="text-white">{entry.word}</strong>
                              <span className="block text-slate-500">
                                {entry.oldSong} · {entry.newSong}
                              </span>
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {!manualReady && (
                <InlineAlert tone="warning" className="mt-2 text-[11px]">
                  Pick {useCount} words manually, or switch to random pick.
                </InlineAlert>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

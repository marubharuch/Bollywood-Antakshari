import { Link, useParams } from 'react-router-dom'
import { AdminShell } from '../../components/admin/AdminShell.jsx'
import { Button } from '../../components/common/Button.jsx'
import { InlineAlert } from '../../components/common/InlineAlert.jsx'
import { ToastStack } from '../../components/common/ToastStack.jsx'
import { RoundRulesSummary } from '../../components/rounds/RoundRulesSummary.jsx'
import { useAdminShell } from '../../hooks/useAdminShell.js'
import { useGameState } from '../../hooks/useGameState.js'
import { STAGE_PROFILE_DEFS } from '../../features/tournament/tournamentRegistry.js'
import {
  isSimpleAntakshariRound,
  validateStageProfile,
} from '../../features/tournament/stageProfileModel.js'
import { normalizeRound } from '../../features/rounds/roundModel.js'
import { MAIN_ROUND_TYPE, mainRoundTypeLabel } from '../../features/rounds/mainRoundType.js'
import { questionBankEntryCount } from '../../features/questionBank/questionBankModel.js'
import { resolveQuestionBankId } from '../../features/questionBank/questionBankRound.js'
import { plannedRoundQuestionListLabel } from '../../features/rounds/roundQuestionModel.js'

export function StageConfigurationPage() {
  const { profileId } = useParams()
  const shell = useAdminShell()
  const { notify, toasts, dismiss } = shell
  const {
    state,
    addRoundToStageProfile,
    removeRoundFromStageProfile,
    moveStageProfileRound,
    setStageProfileQuestionCount,
    saveStageProfile,
    patchStageProfile,
  } = useGameState()

  const def = STAGE_PROFILE_DEFS.find((d) => d.id === profileId)
  const profile = state.stageProfiles?.[profileId]
  const validation = validateStageProfile(profile, state.roundLibrary)
  const availableRounds = (state.roundLibrary ?? []).filter((r) => r.active)

  if (!def || !profile) {
    return (
      <AdminShell state={shell.state} adminRootRef={shell.adminRootRef}>
        <p className="text-slate-400">Unknown stage configuration.</p>
        <Link to="/admin/config"><Button size="sm">Back</Button></Link>
      </AdminShell>
    )
  }

  const handleSave = () => {
    const r = saveStageProfile(profileId)
    if (!r.success) {
      notify(r.errors?.join(' ') ?? 'Fix errors before saving.', 'error')
      return
    }
    notify('Stage configuration saved.', 'success')
  }

  return (
    <AdminShell
      state={shell.state}
      adminRootRef={shell.adminRootRef}
      projectorUrlHint={shell.projectorUrlHint}
      fullscreenActive={shell.fullscreenActive}
      onOpenProjector={shell.handleOpenProjector}
      onFullscreen={shell.handleFullscreen}
      simulationHandlers={shell.simulationHandlers}
    >
      <header className="mb-3">
        <Link to="/admin/config" className="text-xs text-amber-300 hover:underline">
          ← Tournament dashboard
        </Link>
        <h1 className="mt-1 text-xl font-bold text-white">{def.name}</h1>
        <p className="text-xs text-slate-400">{def.description}</p>
      </header>

      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 mb-3">
        <h3 className="text-sm font-semibold text-white">Play order settings</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={profile.playSettings?.questionOrderShuffle ? 'primary' : 'outline'}
            pressed={Boolean(profile.playSettings?.questionOrderShuffle)}
            onClick={() =>
              patchStageProfile(profileId, {
                playSettings: {
                  ...profile.playSettings,
                  questionOrderShuffle: !profile.playSettings?.questionOrderShuffle,
                },
              })
            }
          >
            Shuffle questions
          </Button>
          <Button
            size="sm"
            variant={profile.playSettings?.allowTeamShuffle ? 'primary' : 'outline'}
            pressed={Boolean(profile.playSettings?.allowTeamShuffle)}
            onClick={() => {
              const next = !profile.playSettings?.allowTeamShuffle
              patchStageProfile(profileId, {
                playSettings: {
                  ...profile.playSettings,
                  allowTeamShuffle: next,
                  teamOrderMode: next ? 'shuffle' : 'sequential',
                },
              })
            }}
          >
            Allow shuffled team turns
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Changing this stage plan does not alter scores or progress for tournaments already in
          progress or completed.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
        <h3 className="text-sm font-semibold text-white">Rounds in this stage</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          {availableRounds.map((round) => (
            <Button
              key={round.id}
              size="sm"
              variant="outline"
              onClick={() => {
                const r = addRoundToStageProfile(profileId, round.id)
                if (!r.success) notify(r.error, 'error')
              }}
            >
              + {round.name}
            </Button>
          ))}
        </div>
        {!profile.slots?.length ? (
          <p className="mt-2 text-xs text-slate-500">No rounds yet.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {profile.slots.map((slot, index) => {
              const round = normalizeRound(
                state.roundLibrary?.find((r) => r.id === slot.libraryRoundId),
              )
              const simple = round && isSimpleAntakshariRound(round)
              return (
                <li
                  key={slot.id}
                  className="rounded border border-slate-600/80 bg-slate-950/50 p-2 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-100">
                        {index + 1}. {round?.name ?? 'Missing round'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {mainRoundTypeLabel(round?.mainRoundType)}{' '}
                        {round ? plannedRoundQuestionListLabel(round) : ''}
                        {round && resolveQuestionBankId(round) && (
                          <>
                            {' '}
                            · Question bank:{' '}
                            {questionBankEntryCount(resolveQuestionBankId(round))} available
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => moveStageProfileRound(profileId, slot.id, 'up')}>↑</Button>
                      <Button size="sm" variant="ghost" onClick={() => moveStageProfileRound(profileId, slot.id, 'down')}>↓</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-300"
                        onClick={() => removeRoundFromStageProfile(profileId, slot.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  {!simple && round && (
                    <label className="mt-2 block text-xs text-slate-400">
                      {round.mainRoundType === MAIN_ROUND_TYPE.WORD
                        ? 'Words to use per tournament'
                        : 'Questions per tournament'}
                      <input
                        type="number"
                        min={1}
                        max={
                          validation.slots?.find((s) => s.id === slot.id)?.eligibleCount ||
                          undefined
                        }
                        className="ml-2 w-16 rounded border border-slate-600 bg-slate-950 px-1 py-0.5"
                        value={slot.questionCount ?? ''}
                        onChange={(e) =>
                          setStageProfileQuestionCount(profileId, slot.id, e.target.value)
                        }
                      />
                      {round.mainRoundType === MAIN_ROUND_TYPE.WORD && (
                        <span className="ml-2 text-[10px] text-slate-500">
                          ({validation.slots?.find((s) => s.id === slot.id)?.eligibleCount ?? '—'}{' '}
                          eligible in library; each word once per show)
                        </span>
                      )}
                    </label>
                  )}
                  {simple && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Simple Antakshari — one running score per team (no question count).
                    </p>
                  )}
                  {round && <RoundRulesSummary round={round} selected compact />}
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {!validation.valid && (
        <InlineAlert tone="warning" title="Validation" className="mt-3">
          {validation.errors.join(' ')}
        </InlineAlert>
      )}

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="gold" onClick={handleSave} disabled={!validation.valid}>
          Save stage configuration
        </Button>
        <Link to="/admin/config">
          <Button size="sm" variant="outline">Done</Button>
        </Link>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </AdminShell>
  )
}

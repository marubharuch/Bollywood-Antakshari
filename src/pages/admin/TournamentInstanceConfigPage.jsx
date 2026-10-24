import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminShell } from '../../components/admin/AdminShell.jsx'
import { TeamManagementPanel } from '../../components/teams/TeamManagementPanel.jsx'
import { TournamentDataMigrationPanel } from '../../components/admin/TournamentDataMigrationPanel.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Badge } from '../../components/common/Badge.jsx'
import { InlineAlert } from '../../components/common/InlineAlert.jsx'
import { ToastStack } from '../../components/common/ToastStack.jsx'
import { useAdminShell } from '../../hooks/useAdminShell.js'
import { useGameState } from '../../hooks/useGameState.js'
import { getTournamentInstanceDef } from '../../features/tournament/tournamentRegistry.js'
import { validateStageProfile } from '../../features/tournament/stageProfileModel.js'
import { deriveInstanceDisplayStatus } from '../../features/tournament/tournamentInstanceModel.js'
import { allocateQuestionsForInstance } from '../../features/tournament/questionAllocation.js'
import { isInstanceActiveForEvent } from '../../features/tournament/tournamentEventModel.js'
import { QuestionBankRoundSetupPanel } from '../../components/admin/QuestionBankRoundSetupPanel.jsx'

export function TournamentInstanceConfigPage() {
  const { instanceId } = useParams()
  const navigate = useNavigate()
  const shell = useAdminShell()
  const { notify, toasts, dismiss } = shell
  const [reusePending, setReusePending] = useState(false)

  const {
    state,
    selectTournamentInstance,
    setTeamCountTarget,
    addTeam,
    updateTeam,
    deleteTeam,
    validateAndPrepareTournament,
    startTournamentPlay,
    buildTournamentDataExport,
    importTournamentData,
    validateTournamentDataImport,
    auditOfflineMedia,
    relinkMediaMatches,
    patchQuestionBankRoundSelection,
    setStageProfileQuestionCount,
  } = useGameState()

  const def = getTournamentInstanceDef(instanceId)
  const eventActive = isInstanceActiveForEvent(instanceId, state.tournamentEventSettings)
  const bundle = state.tournamentInstances?.[instanceId]
  const profile = def ? state.stageProfiles?.[def.stageProfileId] : null
  const profileCheck = validateStageProfile(profile, state.roundLibrary)
  const status = deriveInstanceDisplayStatus(bundle, profileCheck.valid)

  const questionPool = useMemo(() => {
    if (!def || !profileCheck.valid) return null
    return allocateQuestionsForInstance(
      profile,
      state.roundLibrary,
      state.tournamentInstances,
      instanceId,
      { allowReuse: false },
      state.tournamentEventSettings,
      state.questionLibrary ?? [],
    )
  }, [
    def,
    profile,
    profileCheck.valid,
    state.roundLibrary,
    state.tournamentInstances,
    state.tournamentEventSettings,
    state.questionLibrary,
    instanceId,
  ])

  const isActive = state.activeTournamentInstanceId === instanceId
  const teams = isActive ? state.teams : bundle?.teams ?? []

  if (!def) {
    return (
      <AdminShell state={shell.state} adminRootRef={shell.adminRootRef}>
        <p>Unknown tournament.</p>
      </AdminShell>
    )
  }

  const ensureActive = () => {
    if (isActive) return true
    const r = selectTournamentInstance(instanceId)
    if (!r.success) {
      notify(r.error ?? 'Could not activate tournament.', 'error')
      return false
    }
    return true
  }

  const handleSave = (allowReuse = false) => {
    if (!ensureActive()) return
    const result = validateAndPrepareTournament({ allowQuestionReuse: allowReuse })
    if (!result.success) {
      if (result.needsReuseChoice) {
        setReusePending(true)
        notify(result.errors?.join(' '), 'warning')
        return
      }
      notify(result.errors?.join(' ') ?? 'Fix configuration.', 'error')
      return
    }
    setReusePending(false)
    notify('Tournament ready to start.', 'success')
  }

  const handleStart = () => {
    if (!ensureActive()) return
    const prep = validateAndPrepareTournament({ allowQuestionReuse: reusePending })
    if (!prep.success) {
      if (prep.needsReuseChoice) {
        setReusePending(true)
        notify(prep.errors?.join(' '), 'warning')
        return
      }
      notify(prep.errors?.join(' ') ?? 'Complete configuration first.', 'error')
      return
    }
    const play = startTournamentPlay()
    if (!play.success) {
      notify(play.errors?.join(' ') ?? play.error ?? 'Cannot start.', 'error')
      return
    }
    notify(`${def.name} started.`, 'success')
    navigate('/admin/play')
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
        <p className="text-xs text-slate-400">{def.stageLabel} · teams &amp; start</p>
        <Badge tone="idle" className="mt-1 normal-case tracking-normal">
          {status.replace('_', ' ')}
        </Badge>
      </header>

      {!eventActive && (
        <InlineAlert tone="info" title="Inactive for this event" className="mb-3">
          This Quarter Final slot is not in the current event workflow. Saved teams and results are
          kept. Increase the active Quarter Final count on the dashboard to include it in play.
        </InlineAlert>
      )}

      {!profileCheck.valid && eventActive && (
        <InlineAlert tone="warning" title="Stage not ready" className="mb-3">
          Configure the {def.stageLabel} stage first.{' '}
          <Link to={`/admin/stage/${def.stageProfileId}`} className="text-amber-300 underline">
            Open stage configuration
          </Link>
        </InlineAlert>
      )}

      {questionPool && !questionPool.success && (
        <InlineAlert tone="warning" title="Question pool" className="mb-3">
          {questionPool.errors?.join(' ')}
          {reusePending && (
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => handleSave(true)}>
                Allow question reuse for this stage
              </Button>
            </div>
          )}
        </InlineAlert>
      )}

      {profileCheck.valid && profile?.slots?.length > 0 && (
        <QuestionBankRoundSetupPanel
          profileSlots={profile.slots}
          roundLibrary={state.roundLibrary}
          selections={bundle?.questionBankSelections ?? {}}
          disabled={!isActive}
          onPatchSelection={(libraryRoundId, patch) => {
            if (!ensureActive()) return
            patchQuestionBankRoundSelection(libraryRoundId, patch, instanceId)
          }}
          onSyncStageQuestionCount={(slotId, count) => {
            if (def?.stageProfileId) {
              setStageProfileQuestionCount(def.stageProfileId, slotId, count)
            }
          }}
        />
      )}

      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 mb-3">
        <p className="text-xs text-slate-400 mb-2">
          Teams for this tournament only. Scores and rosters do not affect other tournaments.
        </p>
        {!isActive && (
          <Button size="sm" variant="outline" className="mb-2" onClick={ensureActive}>
            Load this tournament to edit teams
          </Button>
        )}
        <label className="block text-sm text-slate-300">
          Number of teams
          <input
            type="number"
            min={2}
            max={12}
            disabled={!isActive}
            className="mt-1 w-24 rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm disabled:opacity-50"
            value={teams.length}
            onChange={(e) => setTeamCountTarget(e.target.value)}
          />
        </label>
        <TeamManagementPanel
          teams={teams}
          onAddTeam={addTeam}
          onUpdateTeam={updateTeam}
          onDeleteTeam={deleteTeam}
          onNotify={notify}
        />
      </div>

      <TournamentDataMigrationPanel
        state={state}
        onExport={buildTournamentDataExport}
        onValidateImport={validateTournamentDataImport}
        onImport={importTournamentData}
        onAuditMedia={auditOfflineMedia}
        onRelinkMatches={relinkMediaMatches}
        onNotify={notify}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {eventActive && (
          <>
            <Button size="sm" variant="secondary" onClick={() => handleSave(false)}>
              Save &amp; validate
            </Button>
            <Button
              size="sm"
              variant="gold"
              onClick={handleStart}
              disabled={!profileCheck.valid || teams.length < 2}
            >
              Start tournament
            </Button>
          </>
        )}
        <Link to="/admin/play">
          <Button size="sm" variant="outline">Playing Screen</Button>
        </Link>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </AdminShell>
  )
}

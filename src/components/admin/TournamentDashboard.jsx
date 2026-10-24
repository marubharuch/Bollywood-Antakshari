import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../common/Badge.jsx'
import { Button } from '../common/Button.jsx'
import { InlineAlert } from '../common/InlineAlert.jsx'
import {
  STAGE_PROFILE_DEFS,
  STAGE_PROFILE_ID,
} from '../../features/tournament/tournamentRegistry.js'
import { validateStageProfile } from '../../features/tournament/stageProfileModel.js'
import {
  deriveInstanceDisplayStatus,
  sumTeamScores,
} from '../../features/tournament/tournamentInstanceModel.js'
import {
  countActiveTournamentsForEvent,
  listInactiveQuarterFinalInstances,
  listInstancesActiveForEvent,
} from '../../features/tournament/tournamentEventModel.js'

const STATUS_LABEL = {
  not_configured: 'Not Configured',
  ready: 'Ready',
  in_progress: 'In Progress',
  completed: 'Completed',
  inactive_slot: 'Inactive slot',
}

const STATUS_TONE = {
  not_configured: 'idle',
  ready: 'idle',
  in_progress: 'live',
  completed: 'idle',
  inactive_slot: 'idle',
}

function TournamentInstanceCard({
  def,
  bundle,
  profileValid,
  eventActive,
  workspaceActive,
  onSelectInstance,
  onResetInstance,
  onNotify,
}) {
  const status = eventActive
    ? deriveInstanceDisplayStatus(bundle, profileValid)
    : 'inactive_slot'
  const teams = bundle?.teams ?? []
  const rounds = bundle?.tournament?.plannedRounds?.length ?? 0
  const totalScore = sumTeamScores(teams)

  return (
    <li
      className={`rounded-xl border p-3 ${
        workspaceActive
          ? 'border-amber-500/60 bg-amber-950/20'
          : eventActive
            ? 'border-slate-700 bg-slate-900/40'
            : 'border-slate-800/80 bg-slate-950/30 opacity-90'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-white truncate">{def.name}</p>
          <p className="text-[11px] text-slate-500">{def.stageLabel}</p>
        </div>
        <Badge tone={STATUS_TONE[status]} className="shrink-0 normal-case tracking-normal">
          {STATUS_LABEL[status]}
        </Badge>
      </div>
      <ul className="mt-2 space-y-0.5 text-xs text-slate-300">
        <li>Teams: {teams.length}</li>
        <li>Rounds in plan: {rounds}</li>
        <li>Total score: {totalScore}</li>
      </ul>
      <div className="mt-2 flex flex-wrap gap-1">
        <Link to={`/admin/tournament/${def.id}`}>
          <Button size="sm" variant="secondary">
            {eventActive ? 'Configure' : 'View saved'}
          </Button>
        </Link>
        {eventActive && (
          <Button
            size="sm"
            variant="gold"
            onClick={() => {
              const r = onSelectInstance(def.id)
              if (!r?.success) onNotify?.(r?.error ?? 'Could not open.', 'error')
              else onNotify?.(`Active: ${def.name}`, 'success')
            }}
          >
            {status === 'in_progress' ? 'Resume' : 'Open'}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-red-300"
          onClick={() => {
            const ok = window.confirm(
              `Reset only “${def.name}”? Scores and progress for this tournament will be cleared. Other tournaments are not affected.`,
            )
            if (!ok) return
            const r = onResetInstance(def.id)
            if (!r?.success) onNotify?.(r?.error ?? 'Reset failed.', 'error')
            else onNotify?.(`${def.name} reset.`, 'success')
          }}
        >
          Reset
        </Button>
      </div>
    </li>
  )
}

export function TournamentDashboard({
  state,
  onSelectInstance,
  onResetInstance,
  onSetActiveQuarterFinalCount,
  onNotify,
}) {
  const instances = state.tournamentInstances ?? {}
  const roundLibrary = state.roundLibrary ?? []
  const eventSettings = state.tournamentEventSettings
  const qfCount = eventSettings?.activeQuarterFinalCount ?? 4
  const activeTotal = countActiveTournamentsForEvent(eventSettings)
  const [showInactive, setShowInactive] = useState(false)

  const handleQfCountChange = (count) => {
    const r = onSetActiveQuarterFinalCount(count, { confirmed: false })
    if (r?.needsConfirmation) {
      const ok = window.confirm(
        `${r.errors?.[0] ?? 'Confirm deactivation.'}\n\nContinue anyway?`,
      )
      if (!ok) return
      const confirmed = onSetActiveQuarterFinalCount(count, { confirmed: true })
      if (!confirmed?.success) {
        onNotify?.(confirmed?.errors?.join(' ') ?? 'Could not update.', 'error')
        return
      }
      onNotify?.(`Active Quarter Finals set to ${count}.`, 'success')
      return
    }
    if (!r?.success) {
      onNotify?.(r?.errors?.join(' ') ?? 'Could not update.', 'error')
      return
    }
    onNotify?.(`Active Quarter Finals set to ${count}.`, 'success')
  }

  const activeDefs = listInstancesActiveForEvent(eventSettings)
  const inactiveQfs = listInactiveQuarterFinalInstances(eventSettings)

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-cyan-900/40 bg-cyan-950/15 p-3">
        <h2 className="text-sm font-semibold text-cyan-100">Event size</h2>
        <p className="mt-1 text-xs text-slate-400">
          Choose how many Quarter Finals to run (0–4). Semi Final 1–2 and Grand Finale are always
          included.{' '}
          <strong className="text-slate-300">{activeTotal} active tournaments</strong> for this
          event ({qfCount} QF + 2 SF + 1 GF). Unused Quarter Final slots stay saved but are not
          required for the event.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((n) => (
            <Button
              key={n}
              size="sm"
              variant={qfCount === n ? 'primary' : 'outline'}
              pressed={qfCount === n}
              onClick={() => handleQfCountChange(n)}
            >
              {n === 0 ? 'No Quarter Finals' : `${n} Quarter Final${n > 1 ? 's' : ''}`}
            </Button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-amber-100">Stage configurations</h2>
        <p className="text-xs text-slate-400">
          Configure rounds and question counts once per stage. Active Quarter Finals share one plan.
        </p>
        <ul className="mt-2 grid gap-2 md:grid-cols-3">
          {STAGE_PROFILE_DEFS.map((def) => {
            const profile = state.stageProfiles?.[def.id]
            const validation = validateStageProfile(profile, roundLibrary)
            const qfHint =
              def.id === STAGE_PROFILE_ID.QUARTER_FINAL
                ? qfCount === 0
                  ? ' (optional while no Quarter Finals are active)'
                  : ` (applies to QF1–QF${qfCount})`
                : ''
            return (
              <li
                key={def.id}
                className="rounded-lg border border-slate-700 bg-slate-900/50 p-3"
              >
                <p className="font-semibold text-white">{def.name}</p>
                <p className="text-[11px] text-slate-500">{def.description}{qfHint}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {profile?.slots?.length ?? 0} round(s)
                  {validation.valid ? (
                    <span className="text-emerald-400"> · Saved plan valid</span>
                  ) : (
                    <span className="text-amber-300"> · Needs setup</span>
                  )}
                </p>
                <Link to={`/admin/stage/${def.id}`} className="mt-2 inline-block">
                  <Button size="sm" variant="outline">Configure stage</Button>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-amber-100">Active tournaments</h2>
        <p className="text-xs text-slate-400">Used on the Playing Screen and during the live event.</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {activeDefs.map((def) => {
            const bundle = instances[def.id]
            const profile = state.stageProfiles?.[def.stageProfileId]
            const profileValid = validateStageProfile(profile, roundLibrary).valid
            return (
              <TournamentInstanceCard
                key={def.id}
                def={def}
                bundle={bundle}
                profileValid={profileValid}
                eventActive={true}
                workspaceActive={state.activeTournamentInstanceId === def.id}
                onSelectInstance={onSelectInstance}
                onResetInstance={onResetInstance}
                onNotify={onNotify}
              />
            )
          })}
        </ul>
      </section>

      {inactiveQfs.length > 0 && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-400">Inactive Quarter Final slots</h2>
            <Button size="sm" variant="ghost" onClick={() => setShowInactive((v) => !v)}>
              {showInactive ? 'Hide' : 'Show'} saved data
            </Button>
          </div>
          {!showInactive ? (
            <InlineAlert tone="info" className="mt-2">
              {inactiveQfs.map((d) => d.name).join(', ')} — data preserved, not part of this event.
            </InlineAlert>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {inactiveQfs.map((def) => {
                const bundle = instances[def.id]
                const profile = state.stageProfiles?.[def.stageProfileId]
                const profileValid = validateStageProfile(profile, roundLibrary).valid
                return (
                  <TournamentInstanceCard
                    key={def.id}
                    def={def}
                    bundle={bundle}
                    profileValid={profileValid}
                    eventActive={false}
                    workspaceActive={state.activeTournamentInstanceId === def.id}
                    onSelectInstance={onSelectInstance}
                    onResetInstance={onResetInstance}
                    onNotify={onNotify}
                  />
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

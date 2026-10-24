import { useState } from 'react'
import { Badge } from '../../common/Badge.jsx'
import { Button } from '../../common/Button.jsx'
import { validateStageProfile } from '../../../features/tournament/stageProfileModel.js'
import {
  deriveInstanceDisplayStatus,
  sumTeamScores,
} from '../../../features/tournament/tournamentInstanceModel.js'
import {
  listInactiveQuarterFinalInstances,
  listInstancesActiveForEvent,
} from '../../../features/tournament/tournamentEventModel.js'

const STATUS_LABEL = {
  not_configured: 'Not configured',
  ready: 'Ready',
  in_progress: 'In progress',
  completed: 'Completed',
}

export function TournamentSelectGrid({
  tournamentInstances,
  stageProfiles,
  roundLibrary,
  tournamentEventSettings,
  activeTournamentInstanceId,
  onSelect,
}) {
  const [showInactive, setShowInactive] = useState(false)
  const activeDefs = listInstancesActiveForEvent(tournamentEventSettings)
  const inactiveQfs = listInactiveQuarterFinalInstances(tournamentEventSettings)

  const renderCard = (def, eventActive) => {
    const bundle = tournamentInstances?.[def.id]
    const profile = stageProfiles?.[def.stageProfileId]
    const profileValid = validateStageProfile(profile, roundLibrary).valid
    const status = eventActive
      ? deriveInstanceDisplayStatus(bundle, profileValid)
      : 'inactive_slot'
    const playable =
      eventActive &&
      (status === 'ready' || status === 'in_progress' || status === 'completed')
    const workspaceActive = activeTournamentInstanceId === def.id

    return (
      <li key={def.id}>
        <button
          type="button"
          disabled={!playable && eventActive && status === 'not_configured'}
          className={`w-full rounded-xl border p-4 text-left transition active:scale-[0.99] ${
            workspaceActive
              ? 'border-amber-500/50 bg-amber-950/25'
              : eventActive
                ? 'border-rose-900/40 bg-gradient-to-br from-slate-900 to-rose-950/30 hover:border-amber-500/50'
                : 'border-slate-800 bg-slate-950/40 opacity-80'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          onClick={() => eventActive && onSelect(def.id)}
        >
          <p className="text-lg font-bold text-white">{def.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">{def.stageLabel}</p>
          <p className="mt-1 text-xs text-slate-500">
            {(bundle?.teams?.length ?? 0)} teams · score {sumTeamScores(bundle?.teams)}
          </p>
          <Badge
            tone={status === 'in_progress' ? 'live' : 'idle'}
            className="mt-2 normal-case tracking-normal"
          >
            {eventActive ? STATUS_LABEL[status] ?? status : 'Inactive slot'}
          </Badge>
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="grid gap-2 sm:grid-cols-2">{activeDefs.map((d) => renderCard(d, true))}</ul>
      {inactiveQfs.length > 0 && (
        <div>
          <Button size="sm" variant="ghost" onClick={() => setShowInactive((v) => !v)}>
            {showInactive ? 'Hide' : 'Show'} inactive Quarter Final slots
          </Button>
          {showInactive && (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {inactiveQfs.map((d) => renderCard(d, false))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

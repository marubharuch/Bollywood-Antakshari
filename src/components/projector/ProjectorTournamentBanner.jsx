import { TOURNAMENT_STATUS } from '../../features/tournament/tournamentLifecycle.js'

const MESSAGES = {
  [TOURNAMENT_STATUS.PAUSED]: {
    title: 'Tournament paused',
    body: 'Play will continue when the host resumes.',
  },
  [TOURNAMENT_STATUS.STOPPED]: {
    title: 'Tournament stopped',
    body: 'Progress and scores are saved. Waiting for host to resume.',
  },
  [TOURNAMENT_STATUS.COMPLETED]: {
    title: 'Tournament complete',
    body: 'Final results',
  },
}

export function ProjectorTournamentBanner({ tournament, demoActive }) {
  if (demoActive) return null
  const status = tournament?.status
  const msg = MESSAGES[status]
  if (!msg) return null

  return (
    <div
      className={`mb-1 shrink-0 rounded-lg border px-4 py-2 text-center ${
        status === TOURNAMENT_STATUS.COMPLETED
          ? 'border-amber-500/40 bg-amber-950/30'
          : 'border-slate-500/40 bg-slate-900/60'
      }`}
      role="status"
    >
      <p className="text-lg font-bold tracking-wide text-amber-100">{msg.title}</p>
      <p className="mt-1 text-sm text-slate-300">{msg.body}</p>
    </div>
  )
}

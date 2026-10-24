import {
  getPlayedRoundNames,
  SCORE_DISPLAY_MODE,
} from '../../features/presentation/scoreDisplayModel.js'
import { TOURNAMENT_STATUS } from '../../features/tournament/tournamentLifecycle.js'
import { ProjectorScoreboard } from './ProjectorScoreboard.jsx'

export function ProjectorScoreDisplay({
  scoreDisplay,
  teams,
  assignedTeamId,
  tournament,
  buzzerRound: _buzzerRound,
  inQuestionLive = false,
  fitViewport = false,
  scoreColumns = 'auto',
  scoreboardVariant = 'default',
}) {
  if (!scoreDisplay?.projectorOn || scoreDisplay.mode === SCORE_DISPLAY_MODE.OFF) {
    return null
  }

  const mode = scoreDisplay.mode
  const status = tournament?.status
  const showAllForComplete = status === TOURNAMENT_STATUS.COMPLETED
  const compactStrip = scoreboardVariant === 'strip'

  if (showAllForComplete && mode !== SCORE_DISPLAY_MODE.TEAM) {
    return (
      <section className={`flex min-h-0 flex-1 flex-col overflow-hidden ${inQuestionLive ? '' : ''}`}>
        <p className="mb-1 shrink-0 text-center text-[clamp(0.6rem,1.6vw,0.75rem)] uppercase tracking-widest text-amber-200/80">
          Final results
        </p>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ProjectorScoreboard
            teams={teams}
            fitViewport={fitViewport}
            scoreColumns={scoreColumns}
            variant={scoreboardVariant}
          />
        </div>
      </section>
    )
  }

  if (mode === SCORE_DISPLAY_MODE.TEAM || mode === SCORE_DISPLAY_MODE.CONTEXT) {
    const team = teams?.find((t) => t.id === assignedTeamId)
    if (mode === SCORE_DISPLAY_MODE.TEAM && team) {
      return (
        <section className="min-h-0 shrink-0 overflow-hidden">
          <p className="mb-1 text-center text-[clamp(0.6rem,1.6vw,0.75rem)] uppercase tracking-widest text-slate-400">
            {team.name}
          </p>
          <ProjectorScoreboard
            teams={[team]}
            fitViewport={fitViewport}
            scoreColumns={scoreColumns}
            variant={scoreboardVariant}
          />
        </section>
      )
    }
    if (mode === SCORE_DISPLAY_MODE.TEAM) {
      return (
        <p className="mb-6 text-center text-slate-500">
          Assign a team to show current team score.
        </p>
      )
    }
  }

  if (mode === SCORE_DISPLAY_MODE.ROUND || mode === SCORE_DISPLAY_MODE.ALL) {
    const playedNames = getPlayedRoundNames(tournament)
    if (mode === SCORE_DISPLAY_MODE.ALL && playedNames.length === 0) {
      return (
        <p className="mb-6 text-center text-slate-500">No rounds played yet.</p>
      )
    }
    return (
      <section
        className={`flex min-h-0 flex-col overflow-hidden ${
          compactStrip ? 'shrink-0' : 'flex-1'
        }`}
      >
        {mode === SCORE_DISPLAY_MODE.ALL && !compactStrip && (
          <>
            <p className="mb-0.5 shrink-0 text-center text-[clamp(0.6rem,1.6vw,0.75rem)] uppercase tracking-widest text-slate-400">
              Played rounds — tournament totals
            </p>
            <p className="mb-1 shrink-0 text-center text-[clamp(0.55rem,1.4vw,0.7rem)] text-slate-500 line-clamp-2">
              {playedNames.join(' · ')}
            </p>
          </>
        )}
        {mode === SCORE_DISPLAY_MODE.ROUND && !compactStrip && (
          <p className="mb-1 shrink-0 text-center text-[clamp(0.6rem,1.6vw,0.75rem)] uppercase tracking-widest text-slate-400">
            Current round — tournament totals (per-round scores not tracked)
          </p>
        )}
        <div className={compactStrip ? 'shrink-0 overflow-visible' : 'min-h-0 flex-1 overflow-hidden'}>
          <ProjectorScoreboard
            teams={teams}
            fitViewport={fitViewport}
            scoreColumns={scoreColumns}
            variant={scoreboardVariant}
          />
        </div>
      </section>
    )
  }

  return null
}

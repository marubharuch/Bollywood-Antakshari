import {
  SCORE_PRESENTATION_KIND,
  SCORE_PRESENTATION_PHASE,
  isScorePresentationActive,
} from '../../features/presentation/scorePresentationModel.js'
import { getTeamRoundScore } from '../../features/tournament/roundScoreLedger.js'
import { ROUND_PLAY_STATUS } from '../../features/tournament/tournamentModel.js'
import { ProjectorAllRoundsScoreTable } from './ProjectorAllRoundsScoreTable.jsx'
import { ProjectorScoreboard } from './ProjectorScoreboard.jsx'

export function ProjectorScorePresentation({
  scorePresentation,
  teams,
  tournament,
  scoreColumns = 'auto',
}) {
  if (!isScorePresentationActive(scorePresentation)) return null

  const phase = scorePresentation.phase
  const teamId = scorePresentation.teamOrder?.[scorePresentation.teamIndex]
  const team = teams?.find((t) => t.id === teamId)
  const planned = tournament?.plannedRounds?.find((p) => p.id === scorePresentation.planRoundId)

  const playedRounds = (tournament?.plannedRounds ?? []).filter(
    (p) =>
      p.roundStatus === ROUND_PLAY_STATUS.COMPLETED ||
      (p.roundStatus === ROUND_PLAY_STATUS.ACTIVE && p.stoppedEarly),
  )

  if (phase === SCORE_PRESENTATION_PHASE.TEAM && team) {
    const isRoundEnd = scorePresentation.kind === SCORE_PRESENTATION_KIND.ROUND_END
    const roundPts = isRoundEnd && planned ? getTeamRoundScore(planned, team.id) : null
    return (
      <div className="projector-score-presentation-root text-center">
        <p className="shrink-0 text-[clamp(0.65rem,2vw,0.85rem)] uppercase tracking-[0.35em] text-amber-200/80">
          {isRoundEnd ? 'Round score' : 'Team total'}
        </p>
        <p
          className="mt-2 shrink-0 px-2 font-bold text-white break-words"
          style={{ fontSize: 'clamp(1.5rem, 6vw, 3.75rem)' }}
        >
          {team.name}
        </p>
        {isRoundEnd ? (
          <p
            className="mt-3 shrink-0 font-black tabular-nums text-amber-300"
            style={{ fontSize: 'clamp(2.5rem, 10vw, 5rem)' }}
          >
            {roundPts ?? 0}
            <span
              className="mt-1 block font-normal text-slate-400"
              style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.125rem)' }}
            >
              points this round
            </span>
          </p>
        ) : (
          <p
            className="mt-3 shrink-0 font-black tabular-nums text-amber-300"
            style={{ fontSize: 'clamp(2.5rem, 10vw, 5rem)' }}
          >
            {team.score ?? 0}
            <span
              className="mt-1 block font-normal text-slate-400"
              style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.125rem)' }}
            >
              tournament total
            </span>
          </p>
        )}
      </div>
    )
  }

  if (phase === SCORE_PRESENTATION_PHASE.SCOREBOARD) {
    return (
      <div className="projector-score-presentation-root">
        <p className="shrink-0 text-center text-[clamp(0.65rem,2vw,0.85rem)] uppercase tracking-[0.35em] text-amber-200/80">
          {scorePresentation.kind === SCORE_PRESENTATION_KIND.TOTAL_ASCENDING
            ? 'Tournament standings'
            : 'Round scoreboard'}
        </p>
        {scorePresentation.kind === SCORE_PRESENTATION_KIND.TOTAL_ASCENDING &&
          playedRounds.length > 0 && (
            <p className="mt-1 shrink-0 px-2 text-center text-[clamp(0.55rem,1.6vw,0.7rem)] text-slate-500 line-clamp-2">
              Played rounds:{' '}
              {playedRounds.map((p) => p.snapshot?.name ?? 'Round').join(' · ')}
            </p>
          )}
        <div className="projector-score-presentation-board">
          {scorePresentation.kind === SCORE_PRESENTATION_KIND.TOTAL_ASCENDING ? (
            <ProjectorAllRoundsScoreTable tournament={tournament} teams={teams} />
          ) : (
            <ProjectorScoreboard teams={teams} fitViewport scoreColumns={scoreColumns} />
          )}
        </div>
        {scorePresentation.kind !== SCORE_PRESENTATION_KIND.TOTAL_ASCENDING && (
          <p className="mt-1 shrink-0 text-center text-[clamp(0.55rem,1.4vw,0.65rem)] text-slate-500">
            Cumulative totals shown — per-round breakdown where recorded on each plan.
          </p>
        )}
      </div>
    )
  }

  return null
}

import { getLeadingTeamIds } from '../../utils/gameHelpers.js'

export function ProjectorScoreboard({
  teams,
  fitViewport = false,
  scoreColumns = 'auto',
  variant = 'default',
}) {
  const leaders = getLeadingTeamIds(teams)
  const strip = variant === 'strip'

  if (!teams?.length) {
    return (
      <p className="text-center text-[clamp(0.9rem,2.5vw,1.25rem)] text-slate-400">
        No teams on board
      </p>
    )
  }

  const rootClass = [
    fitViewport && !strip ? 'projector-scoreboard-fit' : '',
    strip ? 'projector-scoreboard-strip' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const colClass = strip
    ? ''
    : scoreColumns === '2'
      ? 'grid-cols-2'
      : scoreColumns === '3'
        ? 'grid-cols-3'
        : scoreColumns === '4'
          ? 'grid-cols-4'
          : fitViewport
            ? ''
            : 'md:grid-cols-2 xl:grid-cols-4'

  return (
    <div
      className={rootClass}
      data-score-columns={strip ? '4' : scoreColumns}
      data-team-count={teams.length}
    >
      <ul
        className={`grid ${colClass} ${fitViewport && !strip ? '' : strip ? '' : 'gap-4'}`}
      >
        {teams.map((team) => {
          const isLeader = leaders.has(team.id)
          return (
            <li
              key={team.id}
              className={`projector-score-card relative overflow-hidden border-2 transition-all ${
                strip ? 'rounded-xl' : 'rounded-2xl'
              } ${
                isLeader
                  ? strip
                    ? 'projector-score-card--leader border-[var(--color-gold)] bg-gradient-to-br from-amber-950/45 to-slate-900/85'
                    : 'animate-leader-glow border-[var(--color-gold)] bg-gradient-to-br from-amber-950/50 to-slate-900/80'
                  : 'border-white/10 bg-[var(--color-cinema-panel)]/90'
              }`}
            >
              <div
                className="absolute left-0 top-0 h-1 w-full"
                style={{ backgroundColor: team.accent }}
              />
              {isLeader && !strip && (
                <span className="mb-1 inline-block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-gold)] xl:text-xs">
                  Leading
                </span>
              )}
              {isLeader && strip && (
                <span
                  className="projector-score-lead-badge"
                  title="Leading"
                  aria-label="Leading team"
                >
                  ★
                </span>
              )}
              <p
                className={`projector-score-name font-bold text-white ${
                  strip
                    ? ''
                    : fitViewport
                      ? ''
                      : `truncate ${isLeader ? 'text-2xl xl:text-3xl' : 'text-xl xl:text-2xl'}`
                }`}
              >
                {team.name}
              </p>
              <p
                className={`projector-score-value tabular-nums font-black text-[var(--color-gold)] ${
                  strip
                    ? ''
                    : `mt-1 ${
                        fitViewport
                          ? isLeader
                            ? 'projector-score-value--lead'
                            : ''
                          : isLeader
                            ? 'text-5xl xl:text-6xl'
                            : 'text-4xl xl:text-5xl'
                      }`
                }`}
              >
                {team.score}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

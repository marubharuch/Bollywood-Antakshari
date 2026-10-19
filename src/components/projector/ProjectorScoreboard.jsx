import { getLeadingTeamIds } from '../../utils/gameHelpers.js'

export function ProjectorScoreboard({ teams }) {
  const leaders = getLeadingTeamIds(teams)

  if (!teams?.length) {
    return (
      <p className="text-center text-xl text-slate-400">No teams on board</p>
    )
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {teams.map((team) => {
        const isLeader = leaders.has(team.id)
        return (
          <li
            key={team.id}
            className={`relative overflow-hidden rounded-2xl border-2 px-6 py-5 transition-all ${
              isLeader
                ? 'animate-leader-glow border-[var(--color-gold)] bg-gradient-to-br from-amber-950/50 to-slate-900/80'
                : 'border-white/10 bg-[var(--color-cinema-panel)]/90'
            }`}
          >
            <div
              className="absolute left-0 top-0 h-1 w-full"
              style={{ backgroundColor: team.accent }}
            />
            {isLeader && (
              <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">
                Leading
              </span>
            )}
            <p
              className={`truncate font-bold ${isLeader ? 'text-2xl xl:text-3xl' : 'text-xl xl:text-2xl'} text-white`}
            >
              {team.name}
            </p>
            <p
              className={`mt-2 tabular-nums font-black text-[var(--color-gold)] ${isLeader ? 'text-5xl xl:text-6xl' : 'text-4xl xl:text-5xl'}`}
            >
              {team.score}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

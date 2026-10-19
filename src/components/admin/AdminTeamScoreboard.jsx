import { Button } from '../common/Button.jsx'

export function AdminTeamScoreboard({ teams, onAdjustScore }) {
  if (!teams?.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-600 p-4 text-center text-sm text-slate-400">
        No teams loaded.
      </p>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {teams.map((team) => (
        <li
          key={team.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-2"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: team.accent }}
                aria-hidden
              />
              <p className="truncate text-sm font-medium text-white">
                {team.name}
              </p>
            </div>
            <p
              className="text-xl font-bold tabular-nums leading-tight text-rose-300"
              aria-live="polite"
              aria-atomic="true"
            >
              {team.score}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              size="sm"
              variant="secondary"
              aria-label={`Increase score for ${team.name}`}
              onClick={() => onAdjustScore(team.id, 5, team.name)}
            >
              +5
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label={`Decrease score for ${team.name}`}
              onClick={() => onAdjustScore(team.id, -5, team.name)}
            >
              −5
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

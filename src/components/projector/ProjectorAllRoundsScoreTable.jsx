import { buildTournamentRoundScoreMatrix } from '../../features/tournament/tournamentRoundScoreMatrix.js'

function formatCell(value) {
  if (!value) return '0'
  return String(value)
}

export function ProjectorAllRoundsScoreTable({
  tournament,
  teams,
  compact = false,
  projector = false,
}) {
  const { columns, rows } = buildTournamentRoundScoreMatrix(tournament, teams)
  if (!columns.length) {
    return <p className="text-center text-slate-400">No rounds configured in this tournament.</p>
  }
  if (!rows.length) {
    return <p className="text-center text-slate-400">No teams on the scoreboard.</p>
  }

  const sizeClass = compact
    ? 'text-[0.65rem]'
    : projector
      ? 'text-[clamp(0.75rem,1.85vw,1.15rem)]'
      : 'text-[clamp(0.65rem,1.6vw,0.85rem)]'

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div
        className={`overflow-x-auto overflow-y-auto ${
          projector ? 'max-h-[min(72vh,40rem)]' : 'max-h-[min(70vh,32rem)]'
        }`}
      >
        <table
          className={`projector-standings-table w-full max-w-full border-collapse text-left table-fixed ${sizeClass}`}
        >
          <thead>
            <tr className="border-b border-amber-500/40">
              <th
                className={`sticky left-0 z-10 bg-[#030208] font-semibold text-[var(--color-gold)] ${
                  projector ? 'px-3 py-3 w-[min(22vw,14rem)]' : 'px-2 py-2 text-amber-200'
                }`}
              >
                Team
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={`px-2 py-2 text-center font-semibold text-[var(--color-gold)] ${
                    projector ? 'px-2 py-3' : 'text-amber-100/90'
                  }`}
                  title={col.label}
                >
                  <span className="block whitespace-normal break-words leading-snug">{col.label}</span>
                </th>
              ))}
              <th
                className={`px-2 py-2 text-center font-bold text-[var(--color-gold)] ${
                  projector ? 'py-3 w-[min(12vw,6rem)]' : ''
                }`}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.teamId} className="border-b border-white/8">
                <td
                  className={`sticky left-0 z-10 bg-[#030208] font-medium text-white ${
                    projector ? 'px-3 py-3 text-[clamp(0.85rem,2.2vw,1.35rem)]' : 'px-2 py-2'
                  }`}
                  style={{ boxShadow: 'inset 4px 0 0 0 ' + (row.accent || '#f59e0b') }}
                >
                  <span className="break-words">{row.teamName}</span>
                </td>
                {row.roundScores.map((score, i) => (
                  <td
                    key={columns[i]?.id ?? i}
                    className={`px-2 text-center tabular-nums text-slate-100 ${
                      projector ? 'py-3 text-[clamp(0.9rem,2.4vw,1.5rem)]' : 'py-2 text-slate-200'
                    }`}
                  >
                    {formatCell(score)}
                  </td>
                ))}
                <td
                  className={`px-2 text-center font-bold tabular-nums text-[var(--color-gold)] ${
                    projector ? 'py-3 text-[clamp(1rem,2.8vw,1.75rem)]' : 'py-2'
                  }`}
                >
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

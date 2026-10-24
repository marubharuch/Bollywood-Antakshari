import { buildTournamentRoundScoreMatrix } from '../../features/tournament/tournamentRoundScoreMatrix.js'

function formatCell(value) {
  if (!value) return '0'
  return String(value)
}

export function ProjectorAllRoundsScoreTable({ tournament, teams, compact = false }) {
  const { columns, rows } = buildTournamentRoundScoreMatrix(tournament, teams)
  if (!columns.length) {
    return <p className="text-center text-slate-400">No rounds configured in this tournament.</p>
  }
  if (!rows.length) {
    return <p className="text-center text-slate-400">No teams on the scoreboard.</p>
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[min(70vh,32rem)]">
        <table
          className={`w-full min-w-[32rem] border-collapse text-left ${
            compact ? 'text-[0.65rem]' : 'text-[clamp(0.65rem,1.6vw,0.85rem)]'
          }`}
        >
          <thead>
            <tr className="border-b border-amber-500/30">
              <th className="sticky left-0 z-10 bg-[#030208] px-2 py-2 font-semibold text-amber-200">
                Team
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="px-2 py-2 text-center font-semibold text-amber-100/90"
                  title={col.label}
                >
                  <span className="line-clamp-2 max-w-[6rem]">{col.label}</span>
                </th>
              ))}
              <th className="px-2 py-2 text-center font-semibold text-[var(--color-gold)]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.teamId} className="border-b border-white/5">
                <td
                  className="sticky left-0 z-10 bg-[#030208] px-2 py-2 font-medium text-white"
                  style={{ boxShadow: 'inset 3px 0 0 0 ' + (row.accent || '#f59e0b') }}
                >
                  <span className="break-words">{row.teamName}</span>
                </td>
                {row.roundScores.map((score, i) => (
                  <td key={columns[i]?.id ?? i} className="px-2 py-2 text-center tabular-nums text-slate-200">
                    {formatCell(score)}
                  </td>
                ))}
                <td className="px-2 py-2 text-center font-bold tabular-nums text-[var(--color-gold)]">
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

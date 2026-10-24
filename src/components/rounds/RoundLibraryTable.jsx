import { getCategoryLabel } from '../../features/rounds/roundHelpers.js'
import { Button } from '../common/Button.jsx'
import { Badge } from '../common/Badge.jsx'

export function RoundLibraryTable({
  roundLibrary,
  onEdit,
  onDuplicate,
  onDelete,
}) {
  if (!roundLibrary?.length) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="min-w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-2 py-2">Round</th>
            <th className="px-2 py-2">Category</th>
            <th className="px-2 py-2">Buzzer</th>
            <th className="px-2 py-2">Timer</th>
            <th className="px-2 py-2">Scoring</th>
            <th className="px-2 py-2">Media</th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roundLibrary.map((round) => (
            <tr key={round.id} className="border-t border-slate-800/80">
              <td className="px-2 py-2">
                <p className="font-medium text-white">{round.name}</p>
                <p className="text-[10px] text-slate-500 line-clamp-2">
                  {round.description || round.instructions || '—'}
                </p>
              </td>
              <td className="px-2 py-2">{getCategoryLabel(round.category)}</td>
              <td className="px-2 py-2">
                {round.rules?.buzzerEnabled ? 'Yes' : 'No'}
              </td>
              <td className="px-2 py-2">
                {round.timing?.useTimer
                  ? `${round.timing.timeLimitSeconds}s`
                  : 'Off'}
              </td>
              <td className="px-2 py-2">
                +{round.scoring?.correctPoints} / −{round.scoring?.wrongPenalty}
              </td>
              <td className="px-2 py-2">
                {round.rules?.mediaRequired ? 'Required' : 'Optional'}
              </td>
              <td className="px-2 py-2">
                <div className="flex flex-wrap gap-1">
                  <Badge tone={round.active ? 'live' : 'paused'}>
                    {round.active ? 'Active' : 'Off'}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => onEdit(round)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDuplicate(round.id)}>
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-300"
                    onClick={() => onDelete(round)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

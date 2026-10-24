import { Badge } from '../../common/Badge.jsx'
import { Button } from '../../common/Button.jsx'
import { getHostConsoleStatus } from '../../../utils/gameHelpers.js'

export function TournamentSessionHeader({ tournament, onReset }) {
  const status = getHostConsoleStatus({ tournament, demoActive: false })

  const handleReset = () => {
    const ok = window.confirm(
      'Reset this tournament for a new game? All scores and gameplay progress for this tournament will be cleared. Tournament configuration, teams, planned rounds and question settings will remain unchanged.',
    )
    if (!ok) return
    const r = onReset()
    if (!r?.success) {
      window.alert(r?.error ?? 'Could not reset tournament.')
      return
    }
    window.alert('Tournament reset successfully.')
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700/80 bg-slate-900/50 px-2 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-amber-100">{tournament?.name}</p>
        <Badge tone={status.tone} className="mt-0.5 normal-case tracking-normal">
          {status.label}
        </Badge>
      </div>
      <Button size="sm" variant="outline" className="border-rose-800/50 text-rose-200" onClick={handleReset}>
        Reset Tournament
      </Button>
    </div>
  )
}

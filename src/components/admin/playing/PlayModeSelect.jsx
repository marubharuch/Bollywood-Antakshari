import { Button } from '../../common/Button.jsx'

export function PlayModeSelect({ onTesting, onTournament }) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-6 text-center">
      <p className="text-sm text-slate-400">Choose how you want to use the Playing Screen.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" variant="outline" className="h-auto py-4" onClick={onTesting}>
          Testing
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Demo, simulation &amp; split-screen
          </span>
        </Button>
        <Button size="lg" variant="gold" className="h-auto py-4" onClick={onTournament}>
          Tournament
          <span className="mt-1 block text-[11px] font-normal text-amber-100/80">
            Live play with saved progress
          </span>
        </Button>
      </div>
    </div>
  )
}

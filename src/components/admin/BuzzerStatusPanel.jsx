import { Button } from '../common/Button.jsx'
import { Badge } from '../common/Badge.jsx'

const IDLE_BUZZER = {
  status: 'idle',
  announcement: null,
  teamId: null,
  teamName: null,
}

function buzzerTone(status) {
  if (status === 'active') return 'active'
  if (status === 'ready') return 'ready'
  return 'idle'
}

export function BuzzerStatusPanel({
  buzzer,
  simulationMode,
  onSimulateBuzzer,
  onClearBuzzer,
}) {
  const safeBuzzer = buzzer ?? IDLE_BUZZER
  const status = safeBuzzer.status ?? 'idle'
  const hasAnnouncement = Boolean(safeBuzzer.announcement)
  const announcement = hasAnnouncement
    ? safeBuzzer.announcement
    : 'Waiting for buzzer activity…'

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Buzzer
        </h2>
        <Badge tone={buzzerTone(status)}>{status}</Badge>
      </div>
      <p
        className={`mt-2 min-h-[2.5rem] text-sm ${hasAnnouncement ? 'font-medium text-amber-100' : 'text-slate-400'}`}
        aria-live="polite"
      >
        {announcement}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          disabled={!simulationMode}
          title={
            simulationMode
              ? 'Trigger a sample buzzer hit'
              : 'Turn Simulation ON to enable'
          }
          onClick={onSimulateBuzzer}
        >
          Simulate Buzzer
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasAnnouncement && status === 'idle'}
          onClick={onClearBuzzer}
        >
          Clear Buzzer
        </Button>
      </div>
    </section>
  )
}

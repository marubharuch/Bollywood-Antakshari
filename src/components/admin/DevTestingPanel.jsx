import { Link } from 'react-router-dom'
import { Badge } from '../common/Badge.jsx'
import { Button } from '../common/Button.jsx'

export function DevTestingPanel({
  simulationMode,
  demoActive,
  onToggleSimulation,
  onToggleDemo,
  onResetDemo,
  tournamentLive = false,
}) {
  const blockDemoStart = tournamentLive && !demoActive

  return (
    <section
      className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-600/40 bg-violet-950/25 px-2.5 py-2"
      aria-label="Development and testing controls"
    >
      <Badge tone="dev" className="shrink-0">Dev</Badge>

      {tournamentLive && !demoActive && (
        <span className="text-[11px] text-amber-200/90">
          Tournament running — use real play controls; demo is disabled here.
        </span>
      )}

      <Button
        size="sm"
        variant={simulationMode ? 'primary' : 'outline'}
        pressed={simulationMode}
        onClick={onToggleSimulation}
        disabled={blockDemoStart}
        title={
          blockDemoStart
            ? 'Not available during a live tournament'
            : 'Auto sample buzzer hits while demo mode is on'
        }
      >
        Simulation {simulationMode ? 'ON' : 'OFF'}
      </Button>

      <Button
        size="sm"
        variant={demoActive ? 'secondary' : 'gold'}
        pressed={demoActive}
        onClick={onToggleDemo}
        disabled={blockDemoStart}
        title={blockDemoStart ? 'End or avoid live tournament before demo' : undefined}
      >
        {demoActive ? 'Stop Demo' : 'Start Demo'}
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={onResetDemo}
        disabled={tournamentLive && !demoActive}
        title={
          tournamentLive && !demoActive
            ? 'Unavailable during live tournament'
            : 'Reset play state to sample data (keeps teams and libraries)'
        }
      >
        Reset Demo
      </Button>

      <Link to="/split-test" className="inline-flex">
        <Button size="sm" variant="ghost">Split-Screen Test</Button>
      </Link>
    </section>
  )
}

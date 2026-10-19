import { Link } from 'react-router-dom'
import { Badge } from '../common/Badge.jsx'
import { Button } from '../common/Button.jsx'

export function DevTestingPanel({
  simulationMode,
  demoActive,
  onToggleSimulation,
  onToggleDemo,
  onResetDemo,
}) {
  return (
    <section
      className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-600/40 bg-violet-950/25 px-2.5 py-2"
      aria-label="Development and testing controls"
    >
      <Badge tone="dev" className="shrink-0">Dev</Badge>

      <Button
        size="sm"
        variant={simulationMode ? 'primary' : 'outline'}
        pressed={simulationMode}
        onClick={onToggleSimulation}
        title="Sample buzzer simulation while demo runs"
      >
        Simulation {simulationMode ? 'ON' : 'OFF'}
      </Button>

      <Button
        size="sm"
        variant={demoActive ? 'secondary' : 'gold'}
        pressed={demoActive}
        onClick={onToggleDemo}
      >
        {demoActive ? 'Stop Demo' : 'Start Demo'}
      </Button>

      <Button size="sm" variant="outline" onClick={onResetDemo}>
        Reset Demo
      </Button>

      <Link to="/split-test" className="inline-flex">
        <Button size="sm" variant="ghost">Split-Screen</Button>
      </Link>

      <span className="hidden text-xs text-violet-200/80 sm:inline">
        {demoActive ? 'Demo live · sync active' : 'Demo idle'}
        {simulationMode ? ' · simulation on' : ''}
      </span>
    </section>
  )
}

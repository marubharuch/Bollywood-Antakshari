import { useState } from 'react'
import { Button } from '../common/Button.jsx'
import { DevTestingPanel } from './DevTestingPanel.jsx'

export function AdminTestingMenu({ simulationHandlers, tournamentLive }) {
  const [open, setOpen] = useState(false)
  const { simulationMode, demoActive } = simulationHandlers ?? {}
  const active = Boolean(simulationMode || demoActive)

  if (!simulationHandlers) return null

  return (
    <div className="relative flex flex-col items-end">
      <Button
        size="sm"
        variant="outline"
        pressed={open}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="admin-testing-panel"
        title="Demo, simulation, and split-screen tools"
      >
        <span className="inline-flex items-center gap-1.5">
          Testing
          {active && (
            <span
              className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30"
              title="Demo or simulation is active"
              aria-hidden
            />
          )}
        </span>
      </Button>
      {open && (
        <div
          id="admin-testing-panel"
          className="absolute right-0 top-full z-50 mt-1 w-[min(100vw-1.5rem,28rem)] rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl"
        >
          <DevTestingPanel {...simulationHandlers} tournamentLive={tournamentLive} />
        </div>
      )}
    </div>
  )
}

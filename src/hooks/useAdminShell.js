import { useRef, useState } from 'react'
import { useFullscreenActive } from './useFullscreenActive.js'
import { useGameState } from './useGameState.js'
import { useToasts } from './useToasts.js'
import { toggleFullscreen } from '../utils/fullscreen.js'
import { openProjectorWindow } from '../utils/projectorWindow.js'
import { isLiveTournamentSession } from '../utils/gameHelpers.js'

export function useAdminShell() {
  const { state, setSimulationMode, startDemo, stopDemo, resetDemo } = useGameState()
  const { toasts, notify, dismiss } = useToasts()
  const fullscreenActive = useFullscreenActive()
  const adminRootRef = useRef(null)
  const [projectorUrlHint, setProjectorUrlHint] = useState(null)

  const handleOpenProjector = () => {
    const { blocked, url } = openProjectorWindow()
    if (blocked) {
      notify(`Popup blocked. Open manually: ${url}`, 'warning')
      setProjectorUrlHint(url)
    } else {
      setProjectorUrlHint(null)
      notify('Projector window opened.', 'success')
    }
  }

  const handleFullscreen = async () => {
    const result = await toggleFullscreen(adminRootRef.current)
    if (!result.ok) notify(result.message ?? 'Fullscreen failed.', 'error')
    else if (result.active) notify('Entered fullscreen.', 'success')
    else notify('Exited fullscreen.', 'info')
  }

  const simulationHandlers = {
    simulationMode: state.simulationMode,
    demoActive: state.demoActive,
    onToggleSimulation: () => {
      const next = !state.simulationMode
      setSimulationMode(next)
      notify(`Simulation ${next ? 'ON' : 'OFF'}.`, next ? 'success' : 'info')
    },
    onToggleDemo: () => {
      if (state.demoActive) {
        stopDemo()
        notify('Demo stopped.', 'info')
        return
      }
      if (isLiveTournamentSession(state)) {
        notify('Cannot start demo during a live tournament.', 'warning')
        return
      }
      const ok = window.confirm(
        'Start demo mode? This marks the session as demo (not a live tournament).',
      )
      if (!ok) return
      startDemo()
      notify('Demo started — projector sync active.', 'success')
    },
    onResetDemo: () => {
      if (isLiveTournamentSession(state)) {
        notify('Cannot reset demo data during a live tournament.', 'warning')
        return
      }
      const ok = window.confirm(
        'Reset play state to sample data? Teams and round/media libraries are kept.',
      )
      if (!ok) return
      resetDemo()
      notify('Demo reset to sample data.', 'success')
    },
    tournamentLive: isLiveTournamentSession(state),
  }

  return {
    state,
    toasts,
    notify,
    dismiss,
    adminRootRef,
    projectorUrlHint,
    fullscreenActive,
    handleOpenProjector,
    handleFullscreen,
    simulationHandlers,
  }
}

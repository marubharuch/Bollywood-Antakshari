import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminNav } from '../components/admin/AdminNav.jsx'
import { AdminTeamScoreboard } from '../components/admin/AdminTeamScoreboard.jsx'
import { BuzzerStatusPanel } from '../components/admin/BuzzerStatusPanel.jsx'
import { DevTestingPanel } from '../components/admin/DevTestingPanel.jsx'
import { AdminMediaPanel } from '../components/media/AdminMediaPanel.jsx'
import { RoundQuestionPanel } from '../components/admin/RoundQuestionPanel.jsx'
import { RoundRulesSummary } from '../components/rounds/RoundRulesSummary.jsx'
import { Badge } from '../components/common/Badge.jsx'
import { Button } from '../components/common/Button.jsx'
import { InlineAlert } from '../components/common/InlineAlert.jsx'
import { ToastStack } from '../components/common/ToastStack.jsx'
import { useFullscreenActive } from '../hooks/useFullscreenActive.js'
import { useGameState } from '../hooks/useGameState.js'
import { useToasts } from '../hooks/useToasts.js'
import { gameStateStore } from '../state/gameStateStore.js'
import {
  eventStatusLabel,
  eventStatusTone,
} from '../utils/gameHelpers.js'
import { toggleFullscreen } from '../utils/fullscreen.js'
import { openProjectorWindow } from '../utils/projectorWindow.js'

export function AdminPage({ embedded = false }) {
  const {
    state,
    adjustTeamScore,
    setSimulationMode,
    startDemo,
    stopDemo,
    resetDemo,
    simulateBuzzerHit,
    clearBuzzer,
    toggleAnswerVisibility,
  } = useGameState()

  const { toasts, notify, dismiss } = useToasts()
  const fullscreenActive = useFullscreenActive()
  const adminRootRef = useRef(null)
  const [projectorUrlHint, setProjectorUrlHint] = useState(null)

  const selectedLibraryRound = useMemo(
    () => state.roundLibrary?.find((r) => r.id === state.selectedRoundId) ?? null,
    [state.roundLibrary, state.selectedRoundId],
  )

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
    if (!result.ok) {
      notify(result.message ?? 'Fullscreen failed.', 'error')
    } else if (result.active) {
      notify('Entered fullscreen.', 'success')
    } else {
      notify('Exited fullscreen.', 'info')
    }
  }

  const handleScoreAdjust = (teamId, delta, teamName) => {
    adjustTeamScore(teamId, delta)
    const team = gameStateStore
      .getState()
      .teams.find((t) => t.id === teamId)
    const name = team?.name ?? teamName ?? 'Team'
    const score = team?.score ?? '—'
    notify(`${name}: ${delta > 0 ? '+' : ''}${delta} → ${score}`, 'info')
  }

  const handleToggleSimulation = () => {
    const next = !state.simulationMode
    setSimulationMode(next)
    notify(`Simulation ${next ? 'ON' : 'OFF'}.`, next ? 'success' : 'info')
  }

  const handleToggleDemo = () => {
    if (state.demoActive) {
      stopDemo()
      notify('Demo stopped.', 'info')
    } else {
      startDemo()
      notify('Demo started — projector sync live.', 'success')
    }
  }

  const handleResetDemo = () => {
    resetDemo()
    notify('Demo reset to sample data.', 'success')
  }

  const handleToggleAnswer = () => {
    toggleAnswerVisibility()
    const revealed = gameStateStore.getState().question?.answerRevealed
    notify(revealed ? 'Answer revealed on projector.' : 'Answer hidden.', 'info')
  }

  const handleSimulateBuzzer = () => {
    if (!state.simulationMode) {
      notify('Turn Simulation ON first.', 'warning')
      return
    }
    simulateBuzzerHit()
    const buzzer = gameStateStore.getState().buzzer
    notify(buzzer?.announcement ?? 'Buzzer simulated.', 'success')
  }

  const handleClearBuzzer = () => {
    clearBuzzer()
    notify('Buzzer cleared.', 'info')
  }

  return (
    <div
      ref={adminRootRef}
      className={`min-h-full bg-slate-950 text-slate-100 ${embedded ? 'h-full overflow-auto text-[13px]' : ''}`}
    >
      <header className="border-b border-slate-800 bg-slate-900/90 px-3 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white sm:text-lg">
              Bollywood Antakshari
            </h1>
            <p className="text-xs text-slate-400">Admin control</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <AdminNav embedded={embedded} />
            <Badge tone={eventStatusTone(state.eventStatus)}>
              {eventStatusLabel(state.eventStatus)}
            </Badge>
            {state.simulationMode && <Badge tone="on">Sim</Badge>}
            {state.demoActive && <Badge tone="live">Demo</Badge>}
            {!embedded && (
              <>
                <Button size="sm" variant="gold" onClick={handleOpenProjector}>
                  Open Projector
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  pressed={fullscreenActive}
                  onClick={handleFullscreen}
                >
                  {fullscreenActive ? 'Exit Full Screen' : 'Full Screen'}
                </Button>
              </>
            )}
          </div>
        </div>
        {!embedded && projectorUrlHint && (
          <div className="mx-auto mt-2 max-w-7xl">
            <InlineAlert title="Projector URL blocked">
              Copy this link into a new tab: {projectorUrlHint}
            </InlineAlert>
          </div>
        )}
        {!embedded && (
          <details className="mx-auto mt-1 max-w-7xl text-[11px] text-slate-500">
            <summary className="cursor-pointer hover:text-slate-400">
              Second display tip
            </summary>
            <p className="mt-0.5 pl-4">
              Move the projector window with Windows display settings — this app
              cannot choose a monitor.
            </p>
          </details>
        )}
      </header>

      {!embedded && (
        <div className="border-b border-slate-800/80 px-3 py-2">
          <div className="mx-auto max-w-7xl">
            <DevTestingPanel
              simulationMode={state.simulationMode}
              demoActive={state.demoActive}
              onToggleSimulation={handleToggleSimulation}
              onToggleDemo={handleToggleDemo}
              onResetDemo={handleResetDemo}
            />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3 py-2">
        <div className="grid gap-2 lg:grid-cols-12">
          <section className="lg:col-span-7">
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Teams — demo scores (+/−5)
            </h2>
            <p className="mb-1.5 text-[11px] text-slate-600">
              Edit roster in Manage Teams. +/- only adjusts demo scores.
            </p>
            <AdminTeamScoreboard
              teams={state.teams}
              onAdjustScore={handleScoreAdjust}
            />
          </section>

          <div className="flex flex-col gap-2 lg:col-span-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-[11px] text-slate-500">Library round (rules)</p>
                <Link to="/rounds">
                  <Button size="sm" variant="ghost">Round Library</Button>
                </Link>
              </div>
              <RoundRulesSummary
                round={selectedLibraryRound}
                selected
                compact={!selectedLibraryRound}
              />
            </div>
            <RoundQuestionPanel
              stage={state.stage}
              round={state.round}
              roundLabel={state.roundLabel}
              question={state.question}
              onToggleAnswer={handleToggleAnswer}
            />
            <BuzzerStatusPanel
              buzzer={state.buzzer}
              simulationMode={state.simulationMode}
              onSimulateBuzzer={handleSimulateBuzzer}
              onClearBuzzer={handleClearBuzzer}
            />
            <AdminMediaPanel onNotify={notify} />
          </div>
        </div>
      </main>

      {!embedded && <ToastStack toasts={toasts} onDismiss={dismiss} />}
    </div>
  )
}

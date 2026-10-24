import { AdminShell } from '../../components/admin/AdminShell.jsx'
import { TournamentDashboard } from '../../components/admin/TournamentDashboard.jsx'
import { ToastStack } from '../../components/common/ToastStack.jsx'
import { useAdminShell } from '../../hooks/useAdminShell.js'
import { useGameState } from '../../hooks/useGameState.js'

export function GameConfigurationPage() {
  const shell = useAdminShell()
  const { notify, toasts, dismiss } = shell
  const {
    state,
    selectTournamentInstance,
    resetTournamentInstance,
    setActiveQuarterFinalCount,
  } = useGameState()

  return (
    <AdminShell
      state={shell.state}
      adminRootRef={shell.adminRootRef}
      projectorUrlHint={shell.projectorUrlHint}
      fullscreenActive={shell.fullscreenActive}
      onOpenProjector={shell.handleOpenProjector}
      onFullscreen={shell.handleFullscreen}
      simulationHandlers={shell.simulationHandlers}
    >
      <header className="mb-3">
        <h1 className="text-xl font-bold text-amber-100">Tournament dashboard</h1>
        <p className="text-xs text-slate-400">
          Configurable Quarter Finals (0–4) · always 2 Semi Finals + Grand Finale · shared stage
          plans · isolated teams and scores
        </p>
      </header>

      <TournamentDashboard
        state={state}
        onSelectInstance={selectTournamentInstance}
        onResetInstance={resetTournamentInstance}
        onSetActiveQuarterFinalCount={setActiveQuarterFinalCount}
        onNotify={notify}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </AdminShell>
  )
}

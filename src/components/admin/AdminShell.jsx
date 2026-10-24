import { Badge } from '../common/Badge.jsx'
import { Button } from '../common/Button.jsx'
import { InlineAlert } from '../common/InlineAlert.jsx'
import { ConnectionStatus } from '../common/ConnectionStatus.jsx'
import { SyncStatusBar } from '../common/SyncStatusBar.jsx'
import { AdminNav } from './AdminNav.jsx'
import { AdminTestingMenu } from './AdminTestingMenu.jsx'
import { getHostConsoleStatus } from '../../utils/gameHelpers.js'

export function AdminShell({
  embedded = false,
  state,
  children,
  adminRootRef,
  projectorUrlHint,
  fullscreenActive,
  onOpenProjector,
  onOpenProjectorSettings,
  onFullscreen,
  simulationHandlers,
}) {
  const hostStatus = getHostConsoleStatus(state)

  return (
    <div
      ref={adminRootRef}
      className={`min-h-full bg-slate-950 text-slate-100 ${embedded ? 'h-full overflow-auto text-[13px]' : ''}`}
    >
      <header className="border-b border-rose-900/40 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 px-3 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white sm:text-lg">
              Bollywood Antakshari
            </h1>
            <p className="text-xs text-amber-200/80">Host console</p>
            {!embedded && (
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <SyncStatusBar updatedAt={state.updatedAt} />
                <ConnectionStatus />
              </div>
            )}
          </div>
          {!embedded && (
            <div
              className="flex flex-wrap items-center justify-end gap-1.5"
              aria-label="Host toolbar"
            >
              <span className="shrink-0" title="Current session status">
                <Badge tone={hostStatus.tone} className="normal-case tracking-normal">
                  {hostStatus.label}
                </Badge>
              </span>
              <Button size="sm" variant="gold" onClick={onOpenProjector}>
                Open Projector
              </Button>
              {onOpenProjectorSettings && (
                <Button size="sm" variant="outline" onClick={onOpenProjectorSettings}>
                  Projector Settings
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                pressed={fullscreenActive}
                onClick={onFullscreen}
              >
                {fullscreenActive ? 'Exit Full Screen' : 'Full Screen'}
              </Button>
              <AdminTestingMenu
                simulationHandlers={simulationHandlers}
                tournamentLive={simulationHandlers?.tournamentLive}
              />
            </div>
          )}
        </div>
        {!embedded && (
          <div className="mx-auto mt-2 max-w-7xl border-t border-slate-800/60 pt-2">
            <AdminNav embedded={embedded} />
          </div>
        )}
        {!embedded && projectorUrlHint && (
          <div className="mx-auto mt-2 max-w-7xl">
            <InlineAlert title="Projector URL blocked">
              Copy this link into a new tab: {projectorUrlHint}
            </InlineAlert>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-3 py-3">{children}</main>
    </div>
  )
}

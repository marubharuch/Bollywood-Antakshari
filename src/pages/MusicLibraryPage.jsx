import { AdminShell } from '../components/admin/AdminShell.jsx'
import { AdminMediaPanel } from '../components/media/AdminMediaPanel.jsx'
import { MusicLibraryPanel } from '../components/media/MusicLibraryPanel.jsx'
import { ToastStack } from '../components/common/ToastStack.jsx'
import { useAdminShell } from '../hooks/useAdminShell.js'
import { useGameState } from '../hooks/useGameState.js'

export function MusicLibraryPage() {
  const shell = useAdminShell()
  const {
    state,
    appendMediaLibraryItems,
    updateMediaMetadata,
    removeMediaFromLibrary,
    selectMediaForPlayback,
    addExternalMediaLink,
  } = useGameState()
  const { notify, toasts, dismiss } = shell

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
        <h2 className="text-lg font-bold text-amber-100">Media Library</h2>
        <p className="text-xs text-slate-400">
          Audio, video, images and text — stored offline in IndexedDB when imported.
        </p>
      </header>

      <section className="mb-3 rounded-lg border border-slate-700/80 bg-slate-900/30 p-3">
        <MusicLibraryPanel
          mediaLibrary={state.mediaLibrary}
          roundLibrary={state.roundLibrary}
          onImportComplete={(items) => appendMediaLibraryItems(items)}
          onUpdateMetadata={(id, patch) => updateMediaMetadata(id, patch)}
          onDeleteMetadata={(id) => removeMediaFromLibrary(id)}
          onSelectForPlayback={(id) => selectMediaForPlayback(id)}
          onAddExternalLink={(url, title) => addExternalMediaLink(url, title)}
          onNotify={notify}
        />
      </section>

      <section className="rounded-lg border border-slate-700/80 bg-slate-900/30 p-3">
        <AdminMediaPanel onNotify={notify} compact={false} />
      </section>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </AdminShell>
  )
}

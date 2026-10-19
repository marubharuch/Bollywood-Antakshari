import { Link } from 'react-router-dom'
import { AdminNav } from '../components/admin/AdminNav.jsx'
import { AdminMediaPanel } from '../components/media/AdminMediaPanel.jsx'
import { MusicLibraryPanel } from '../components/media/MusicLibraryPanel.jsx'
import { Button } from '../components/common/Button.jsx'
import { ToastStack } from '../components/common/ToastStack.jsx'
import { useGameState } from '../hooks/useGameState.js'
import { useToasts } from '../hooks/useToasts.js'

export function MusicLibraryPage() {
  const {
    state,
    appendMediaLibraryItems,
    updateMediaMetadata,
    removeMediaFromLibrary,
    selectMediaForPlayback,
    addExternalMediaLink,
  } = useGameState()
  const { toasts, notify, dismiss } = useToasts()

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-3 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-white">Bollywood Antakshari</h1>
            <p className="text-xs text-slate-400">Music library &amp; offline player</p>
          </div>
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-3 px-3 py-3">
        <div className="flex justify-end">
          <Link to="/">
            <Button size="sm" variant="outline">← Control Panel</Button>
          </Link>
        </div>

        <section className="rounded-lg border border-slate-700/80 bg-slate-900/30 p-3">
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
      </main>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

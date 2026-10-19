import { Link } from 'react-router-dom'
import { AdminNav } from '../components/admin/AdminNav.jsx'
import { RoundLibraryPanel } from '../components/rounds/RoundLibraryPanel.jsx'
import { Button } from '../components/common/Button.jsx'
import { ToastStack } from '../components/common/ToastStack.jsx'
import { useGameState } from '../hooks/useGameState.js'
import { useToasts } from '../hooks/useToasts.js'

export function RoundLibraryPage() {
  const {
    state,
    saveRound,
    duplicateRound,
    deleteRound,
    selectRound,
    createEmptyRoundDraft,
  } = useGameState()
  const { toasts, notify, dismiss } = useToasts()

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-3 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-white">Bollywood Antakshari</h1>
            <p className="text-xs text-slate-400">Round library &amp; scoring rules</p>
          </div>
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Rules are stored locally and synced across admin tabs. Match scoring comes in a later phase.
          </p>
          <Link to="/">
            <Button size="sm" variant="outline">← Control Panel</Button>
          </Link>
        </div>

        <section className="rounded-lg border border-slate-700/80 bg-slate-900/30 p-3">
          <RoundLibraryPanel
            roundLibrary={state.roundLibrary}
            selectedRoundId={state.selectedRoundId}
            onSaveRound={saveRound}
            onDuplicateRound={duplicateRound}
            onDeleteRound={deleteRound}
            onSelectRound={selectRound}
            onCreateDraft={createEmptyRoundDraft}
            onNotify={notify}
          />
        </section>
      </main>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

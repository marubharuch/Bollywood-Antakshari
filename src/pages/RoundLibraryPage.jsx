import { AdminShell } from '../components/admin/AdminShell.jsx'
import { RoundLibraryWorkspace } from '../components/rounds/RoundLibraryWorkspace.jsx'
import { ToastStack } from '../components/common/ToastStack.jsx'
import { useAdminShell } from '../hooks/useAdminShell.js'
import { useGameState } from '../hooks/useGameState.js'

export function RoundLibraryPage() {
  const shell = useAdminShell()
  const {
    state,
    saveRound,
    duplicateRound,
    deleteRound,
    createEmptyRoundDraft,
    upsertQuestionLibraryEntry,
    selectMediaForPlayback,
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
        <h2 className="text-lg font-bold text-amber-100">Round Library</h2>
        <p className="text-xs text-slate-400">
          Create custom rounds with a main type (શબ્દ, Audio, etc.). Tournament plans snapshot rounds
          when added — editing here does not change an active tournament.
        </p>
      </header>

      <RoundLibraryWorkspace
        roundLibrary={state.roundLibrary}
        questionLibrary={state.questionLibrary}
        mediaLibrary={state.mediaLibrary}
        onSaveRound={saveRound}
        onUpsertQuestionLibraryEntry={upsertQuestionLibraryEntry}
        onPreviewMedia={(q, mediaItem) => {
          if (!mediaItem?.id) return
          selectMediaForPlayback(mediaItem.id, {
            segmentStartSeconds: q.media?.segmentStartSeconds ?? null,
            segmentEndSeconds: q.media?.segmentEndSeconds ?? null,
          })
          notify('Preview loaded in admin media player.', 'success')
        }}
        onDuplicateRound={duplicateRound}
        onDeleteRound={deleteRound}
        onCreateDraft={createEmptyRoundDraft}
        onNotify={notify}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </AdminShell>
  )
}

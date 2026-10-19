import { useRef, useState } from 'react'
import { ConnectionStatus } from '../components/common/ConnectionStatus.jsx'
import { SyncStatusBar } from '../components/common/SyncStatusBar.jsx'
import { useProjectorBootstrap } from '../hooks/useProjectorBootstrap.js'
import { ProjectorMediaDisplay } from '../components/projector/ProjectorMediaDisplay.jsx'
import { ProjectorBuzzerBanner } from '../components/projector/ProjectorBuzzerBanner.jsx'
import { ProjectorQuestion } from '../components/projector/ProjectorQuestion.jsx'
import { ProjectorScoreboard } from '../components/projector/ProjectorScoreboard.jsx'
import { Button } from '../components/common/Button.jsx'
import { ToastStack } from '../components/common/ToastStack.jsx'
import { useFullscreenActive } from '../hooks/useFullscreenActive.js'
import { useGameState } from '../hooks/useGameState.js'
import { useToasts } from '../hooks/useToasts.js'
import { toggleFullscreen } from '../utils/fullscreen.js'

export function ProjectorPage({ embedded = false, showPresentationControls = true }) {
  const { state } = useGameState()
  const rootRef = useRef(null)
  const fullscreenActive = useFullscreenActive()
  const { toasts, notify, dismiss } = useToasts()
  const [reloadNote, setReloadNote] = useState(null)

  useProjectorBootstrap({
    embedded,
    onPausedForReload: () => {
      setReloadNote('Playback paused after reload — press Play to resume.')
      notify('Projector synced. Press Play to resume media.', 'info')
    },
  })

  const handleFullscreen = async () => {
    const result = await toggleFullscreen(rootRef.current)
    if (!result.ok) {
      notify(result.message ?? 'Fullscreen failed.', 'error')
    }
  }

  return (
    <div
      ref={rootRef}
      className={`relative min-h-full overflow-hidden bg-[var(--color-cinema-bg)] text-white ${
        embedded ? 'h-full' : 'min-h-screen'
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3b0764_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_#7f1d1d_0%,_transparent_45%)] opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-full flex-col px-4 py-6 sm:px-8 sm:py-8">
        {showPresentationControls && !embedded && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-left">
              <ConnectionStatus />
              <SyncStatusBar updatedAt={state.updatedAt} note={reloadNote} />
            </div>
            <Button
              variant="gold"
              size="sm"
              pressed={fullscreenActive}
              onClick={handleFullscreen}
            >
              {fullscreenActive ? 'Exit Full Screen' : 'Full Screen'}
            </Button>
          </div>
        )}

        <header className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-rose-300/90">
            Bollywood Antakshari Tournament
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-amber-200 via-[var(--color-gold)] to-amber-400 bg-clip-text text-4xl font-black text-transparent md:text-5xl">
            {state.stage}
          </h1>
          <p className="mt-2 text-lg text-slate-300">
            Round {state.round} — {state.roundLabel}
          </p>
        </header>

        <section className="mb-8 flex-1">
          <ProjectorScoreboard teams={state.teams} />
        </section>

        <ProjectorMediaDisplay />

        <section className="mb-6">
          <ProjectorQuestion
            question={state.question}
            hideAnswer={Boolean(state.mediaPlayback?.hideAnswerOnProjector)}
            hidePrompt={Boolean(state.mediaPlayback?.hideTitleOnProjector)}
          />
        </section>

        <footer>
          <ProjectorBuzzerBanner buzzer={state.buzzer} />
        </footer>
      </div>

      {!embedded && <ToastStack toasts={toasts} onDismiss={dismiss} />}
    </div>
  )
}

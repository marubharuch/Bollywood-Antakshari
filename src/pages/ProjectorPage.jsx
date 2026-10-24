import { useRef, useState } from 'react'
import { ConnectionStatus } from '../components/common/ConnectionStatus.jsx'
import { SyncStatusBar } from '../components/common/SyncStatusBar.jsx'
import { useProjectorBootstrap } from '../hooks/useProjectorBootstrap.js'
import { Button } from '../components/common/Button.jsx'
import { ToastStack } from '../components/common/ToastStack.jsx'
import { useFullscreenActive } from '../hooks/useFullscreenActive.js'
import { useGameState } from '../hooks/useGameState.js'
import { useToasts } from '../hooks/useToasts.js'
import { toggleFullscreen } from '../utils/fullscreen.js'
import { useScoreAnnouncementExpiry } from '../hooks/useScoreAnnouncementExpiry.js'
import { useProjectorViewportLock } from '../hooks/useProjectorViewportLock.js'
import { useProjectorScreenSettings } from '../hooks/useProjectorScreenSettings.js'
import { ProjectorAppearanceShell } from '../components/projector/ProjectorAppearanceShell.jsx'
import { ProjectorStage } from '../components/projector/ProjectorStage.jsx'

export function ProjectorPage({ embedded = false, showPresentationControls = true }) {
  const { state } = useGameState()
  const { settings } = useProjectorScreenSettings()
  useScoreAnnouncementExpiry()
  useProjectorViewportLock(embedded)
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
    <ProjectorAppearanceShell
      settings={settings}
      embedded={embedded}
      className=""
      rootRef={rootRef}
    >
      {showPresentationControls && !embedded && (
        <div className="projector-toolbar">
          <div className="min-w-0 text-left text-xs">
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

      <ProjectorStage state={state} appearance={settings} />

      {!embedded && <ToastStack toasts={toasts} onDismiss={dismiss} />}
    </ProjectorAppearanceShell>
  )
}

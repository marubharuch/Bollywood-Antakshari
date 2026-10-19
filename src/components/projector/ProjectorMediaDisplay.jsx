import { memo, useMemo } from 'react'
import { useGameState } from '../../hooks/useGameState.js'
import { useMediaPlaybackSync } from '../../hooks/useMediaPlaybackSync.js'
import { Button } from '../common/Button.jsx'
import { MediaEngine } from '../media/MediaEngine.jsx'

export const ProjectorMediaDisplay = memo(function ProjectorMediaDisplay() {
  const { state, patchMediaPlayback } = useGameState()
  const playback = state.mediaPlayback
  const item = useMemo(
    () => state.mediaLibrary?.find((m) => m.id === playback?.mediaId) ?? null,
    [state.mediaLibrary, playback?.mediaId],
  )

  const sync = useMediaPlaybackSync({
    item,
    playback,
    role: 'display',
    patchMediaPlayback,
  })

  const showVideo =
    item &&
    playback?.showVideoOnProjector &&
    item.mediaType === 'video' &&
    playback.playbackMode === 'video'

  const active =
    item &&
    (playback?.status === 'playing' || playback?.status === 'paused')

  if (!playback?.mediaId || !item) return null

  const hideTitle = playback?.hideTitleOnProjector
  const showControls = playback?.showVideoControls && showVideo

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-black/50 p-4 text-center">
      {!hideTitle && active && (
        <p className="mb-3 text-lg font-semibold text-[var(--color-gold)]">
          {item.displayTitle}
        </p>
      )}

      <MediaEngine
        mediaRef={sync.mediaRef}
        item={item}
        onTimeUpdate={sync.onTimeUpdate}
        onLoadedMetadata={sync.onLoadedMetadata}
        showVideo={showVideo}
        controls={showControls}
        className={
          showVideo
            ? `mx-auto max-h-[40vh] w-full max-w-3xl rounded-lg bg-black ${showControls ? '' : 'pointer-events-none'}`
            : 'sr-only absolute h-px w-px opacity-0'
        }
      />

      {!showVideo && active && item.mediaType === 'video' && (
        <p className="text-sm text-slate-400">Audio-only on projector (video track not shown)</p>
      )}

      {playback?.status === 'paused' && (
        <p className="mt-2 text-xs uppercase tracking-widest text-slate-500">Paused</p>
      )}

      {(sync.loadError || playback?.error || sync.needsProjectorGesture) && (
        <div className="mt-2 space-y-2">
          {playback?.error && <p className="text-sm text-red-300">{playback.error}</p>}
          {sync.loadError && <p className="text-sm text-red-300">{sync.loadError}</p>}
          {sync.needsProjectorGesture && (
            <Button size="sm" variant="gold" onClick={() => sync.play()}>
              Enable playback on projector
            </Button>
          )}
        </div>
      )}
    </section>
  )
})

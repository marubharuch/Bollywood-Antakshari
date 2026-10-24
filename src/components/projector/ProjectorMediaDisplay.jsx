import { memo, useEffect, useMemo } from 'react'
import { useGameState } from '../../hooks/useGameState.js'
import { useMediaPlaybackSync } from '../../hooks/useMediaPlaybackSync.js'
import { mediaDisplayDiag } from '../../features/media/mediaDisplayDiag.js'
import { Button } from '../common/Button.jsx'
import { MediaEngine } from '../media/MediaEngine.jsx'

export const ProjectorMediaDisplay = memo(function ProjectorMediaDisplay({ layout = 'default' }) {
  const fill = layout === 'fill'
  const { state, patchMediaPlayback } = useGameState()
  const playback = state.mediaPlayback
  const liveQuestion = useMemo(() => {
    const idx = state.playSession?.questionIndex ?? 0
    return state.playSession?.questions?.[idx] ?? null
  }, [state.playSession?.questionIndex, state.playSession?.questions])

  const effectiveMediaId = playback?.mediaId ?? liveQuestion?.mediaId ?? null
  const isVideoQuestion =
    liveQuestion?.contentType === 'video' ||
    Boolean(
      effectiveMediaId &&
        state.mediaLibrary?.find((m) => m.id === effectiveMediaId)?.mediaType === 'video',
    )

  const item = useMemo(
    () => state.mediaLibrary?.find((m) => m.id === effectiveMediaId) ?? null,
    [state.mediaLibrary, effectiveMediaId],
  )

  const sync = useMediaPlaybackSync({
    item,
    playback: effectiveMediaId ? { ...playback, mediaId: effectiveMediaId } : playback,
    role: 'display',
    patchMediaPlayback,
  })

  useEffect(() => {
    mediaDisplayDiag('question-context', {
      questionId: liveQuestion?.id ?? null,
      mediaId: effectiveMediaId,
      libraryHit: Boolean(item),
      mediaType: item?.mediaType ?? null,
    })
  }, [liveQuestion?.id, effectiveMediaId, item])

  const isVideoItem = item?.mediaType === 'video'
  const showVideo = isVideoItem && playback?.playbackMode !== 'audio'

  const isPlaying = playback?.status === 'playing'
  const isPaused = playback?.status === 'paused'
  const loading = showVideo && sync.mediaLoading && !sync.mediaReady && !sync.loadError

  const sectionClass = fill
    ? 'projector-media-fill rounded-lg border border-white/10 bg-black/80 p-2 text-center shadow-xl sm:p-3'
    : 'relative z-20 mb-6 rounded-2xl border border-white/10 bg-black/80 p-4 text-center shadow-xl'

  if (!effectiveMediaId) {
    if (isVideoQuestion) {
      return (
        <section className={`${sectionClass} border-amber-600/40 bg-amber-950/20 text-sm text-amber-100`}>
          Video question is active but no media is linked yet. Select the question again on the
          Playing Screen.
        </section>
      )
    }
    return null
  }

  if (!item) {
    return (
      <section className={`${sectionClass} border-amber-600/40 bg-amber-950/20 text-sm text-amber-100`}>
        This question&apos;s media is not in this browser&apos;s library. Import the same video in
        Media Library on this machine (IndexedDB), then reload the projector.
      </section>
    )
  }

  return (
    <section className={sectionClass}>
      {showVideo && (
        <div className={`projector-video-frame relative w-full ${fill ? 'flex-1' : 'mx-auto max-w-5xl'}`}>
          {loading && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-sm text-slate-300"
              aria-live="polite"
            >
              Loading video…
            </div>
          )}
          <MediaEngine
            mediaRef={sync.mediaRef}
            item={item}
            onTimeUpdate={sync.onTimeUpdate}
            onLoadedMetadata={sync.onLoadedMetadata}
            onCanPlay={sync.onCanPlay}
            onError={sync.onMediaError}
            onEmptied={sync.onEmptied}
            showVideo={true}
            controls={Boolean(playback?.showVideoControls)}
            className={`projector-video-element bg-black ${
              fill ? '' : 'aspect-video w-full object-contain'
            } ${playback?.showVideoControls ? '' : 'pointer-events-none'}`}
          />
          {!fill &&
            !loading &&
            !isPlaying &&
            !isPaused &&
            !sync.loadError &&
            playback?.status !== 'playing' && (
            <p className="py-2 text-xs text-slate-400">
              Starting video… or tap Enable below if the browser blocks playback
            </p>
          )}
        </div>
      )}

      {!showVideo && isVideoItem && playback?.playbackMode === 'audio' && (
        <>
          <p className="text-sm text-slate-400">Audio-only on projector (video hidden)</p>
          <MediaEngine
            mediaRef={sync.mediaRef}
            item={item}
            onTimeUpdate={sync.onTimeUpdate}
            onLoadedMetadata={sync.onLoadedMetadata}
            onCanPlay={sync.onCanPlay}
            onError={sync.onMediaError}
            showVideo={false}
            className="sr-only absolute h-px w-px opacity-0"
          />
        </>
      )}

      {!showVideo && item.mediaType === 'audio' && (
        <MediaEngine
          mediaRef={sync.mediaRef}
          item={item}
          onTimeUpdate={sync.onTimeUpdate}
          onLoadedMetadata={sync.onLoadedMetadata}
          onCanPlay={sync.onCanPlay}
          onError={sync.onMediaError}
          showVideo={false}
          className="sr-only absolute h-px w-px opacity-0"
        />
      )}

      {isPaused && (
        <p className="mt-2 text-xs uppercase tracking-widest text-slate-500">Paused</p>
      )}

      {(sync.loadError || playback?.error || sync.needsProjectorGesture) && (
        <div className="mt-2 space-y-2">
          {playback?.error && <p className="text-sm text-red-300">{playback.error}</p>}
          {sync.loadError && <p className="text-sm text-red-300">{sync.loadError}</p>}
          {(sync.needsProjectorGesture || playback?.videoAutoplaySoundBlocked) && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="gold" onClick={() => sync.play()}>
                Enable playback on projector
              </Button>
              {playback?.videoAutoplaySoundBlocked && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    patchMediaPlayback(
                      {
                        videoMuted: false,
                        videoAutoplaySoundBlocked: false,
                        status: 'playing',
                        error: null,
                        syncSeq: Date.now(),
                      },
                      { command: true },
                    )
                  }}
                >
                  Enable video sound
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {playback?.status === 'error' && !playback?.error && !sync.loadError && (
        <p className="mt-2 text-sm text-red-300">Could not play this media file.</p>
      )}
    </section>
  )
})

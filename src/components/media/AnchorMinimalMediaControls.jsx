import { useMemo } from 'react'
import { useGameState } from '../../hooks/useGameState.js'
import { useMediaPlaybackSync } from '../../hooks/useMediaPlaybackSync.js'
import {
  resolveQuestionMediaType,
  shouldShowAnchorMediaControls,
} from '../../features/media/questionMedia.js'
import { Button } from '../common/Button.jsx'

function formatTime(t) {
  if (!t || !Number.isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function AnchorMinimalMediaControls({ question, round, onNotify }) {
  const { state, patchMediaPlayback, selectMediaForPlayback, setVideoSoundMuted } = useGameState()
  const mediaType = useMemo(
    () => resolveQuestionMediaType(question, state.mediaLibrary, round),
    [question, state.mediaLibrary, round],
  )

  const item = useMemo(
    () => state.mediaLibrary?.find((m) => m.id === question?.mediaId) ?? null,
    [state.mediaLibrary, question?.mediaId],
  )

  const playback = state.mediaPlayback
  const sync = useMediaPlaybackSync({
    item: playback?.mediaId === item?.id ? item : null,
    playback,
    role: 'control',
    patchMediaPlayback,
  })

  if (!shouldShowAnchorMediaControls(mediaType) || !item) {
    return null
  }

  const isPlaying = playback?.status === 'playing'
  const isPaused = playback?.status === 'paused'
  const videoMuted = Boolean(playback?.videoMuted)
  const audioMuted = (playback?.volume ?? 0.85) === 0
  const duration = playback?.duration || 0
  const current = playback?.currentTime || 0
  const segStart = question?.segmentStartSeconds ?? playback?.segmentStart ?? 0
  const segEnd =
    typeof question?.segmentEndSeconds === 'number'
      ? question.segmentEndSeconds
      : playback?.segmentEnd

  const ensureSelected = async () => {
    if (playback?.mediaId !== item.id) {
      const r = selectMediaForPlayback(item.id, {
        segmentStart: question?.segmentStartSeconds ?? null,
        segmentEnd: question?.segmentEndSeconds ?? null,
      })
      if (!r.success) {
        onNotify?.(r.error, 'error')
        return false
      }
    }
    return true
  }

  const handlePlayPause = async () => {
    if (!(await ensureSelected())) return
    if (isPlaying) {
      sync.pause()
      return
    }
    const result = await sync.play()
    if (!result.ok) onNotify?.(result.error, 'warning')
  }

  const handleRestart = async () => {
    if (!(await ensureSelected())) return
    sync.stop()
  }

  const handleSeek = async (time) => {
    if (!(await ensureSelected())) return
    let t = time
    if (typeof segEnd === 'number' && t > segEnd) t = segEnd
    if (t < segStart) t = segStart
    sync.seek(t)
  }

  const seekMax = duration > 0 ? duration : typeof segEnd === 'number' ? segEnd : 0

  return (
    <div className="flex w-full max-w-md flex-col gap-2 rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {mediaType}
        </span>
        {(mediaType === 'audio' || mediaType === 'video') && (
          <>
            <Button size="sm" variant="gold" onClick={handlePlayPause}>
              {isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRestart}>
              Restart
            </Button>
            {mediaType === 'video' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVideoSoundMuted(!videoMuted)}
              >
                {videoMuted ? 'Video muted' : 'Video sound on'}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => sync.setVolume(audioMuted ? 0.85 : 0)}
              >
                {audioMuted ? 'Unmute' : 'Mute'}
              </Button>
            )}
          </>
        )}
        {mediaType === 'image' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              if (!(await ensureSelected())) return
              patchMediaPlayback(
                {
                  showVideoOnProjector: true,
                  status: 'stopped',
                  syncSeq: Date.now(),
                },
                { command: true },
              )
            }}
          >
            Show image
          </Button>
        )}
      </div>

      {(mediaType === 'audio' || mediaType === 'video') && seekMax > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-slate-500">{formatTime(current)}</span>
          <input
            type="range"
            min={segStart}
            max={seekMax}
            step={0.1}
            value={Math.min(current, seekMax)}
            className="h-1.5 flex-1 accent-rose-500"
            aria-label="Seek"
            onChange={(e) => handleSeek(Number(e.target.value))}
          />
          <span className="text-[10px] tabular-nums text-slate-500">{formatTime(seekMax)}</span>
        </div>
      )}
    </div>
  )
}

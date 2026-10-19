import { Button } from '../common/Button.jsx'
import { formatFileSize } from '../../features/media/mediaModel.js'

export function MediaPlaybackControls({
  item,
  playback,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onVolume,
  onTogglePlaybackMode,
  onToggleShowVideo,
  onToggleShowVideoControls,
  onToggleHideTitle,
  onToggleHideAnswer,
  compact = false,
}) {
  const status = playback?.status ?? 'idle'
  const duration = playback?.duration || 0
  const current = playback?.currentTime || 0
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0

  const formatTime = (t) => {
    if (!t || !Number.isFinite(t)) return '0:00'
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const isPlaying = status === 'playing'
  const canVideo = item?.mediaType === 'video'
  const videoMode = playback?.playbackMode === 'video'

  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-800/50 ${compact ? 'p-2' : 'p-3'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {item?.displayTitle ?? 'No track selected'}
          </p>
          <p className="text-[11px] text-slate-500">
            {item
              ? `${item.mediaType.toUpperCase()} · ${formatFileSize(item.sizeBytes)}${item.offlineReady ? ' · offline' : item.source === 'external' ? ' · stream' : ''}`
              : 'Select media from library'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="gold"
            disabled={!item}
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button size="sm" variant="outline" disabled={!item} onClick={onStop}>
            Stop
          </Button>
        </div>
      </div>

      {playback?.error && (
        <p className="mt-2 text-xs text-red-300">{playback.error}</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] tabular-nums text-slate-500">{formatTime(current)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          disabled={!item || !duration}
          className="h-1.5 flex-1 accent-rose-500"
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Seek"
        />
        <span className="text-[10px] tabular-nums text-slate-500">{formatTime(duration)}</span>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={playback?.volume ?? 0.85}
          className="h-1.5 flex-1 accent-rose-500"
          onChange={(e) => onVolume(Number(e.target.value))}
        />
      </label>

      <div className="mt-2 flex flex-wrap gap-1">
        {canVideo && (
          <Button
            size="sm"
            variant={videoMode ? 'primary' : 'outline'}
            pressed={videoMode}
            onClick={onTogglePlaybackMode}
          >
            {videoMode ? 'Video Mode' : 'Audio Only'}
          </Button>
        )}
        <Button
          size="sm"
          variant={playback?.showVideoOnProjector ? 'primary' : 'outline'}
          pressed={Boolean(playback?.showVideoOnProjector)}
          onClick={onToggleShowVideo}
        >
          Projector Video {playback?.showVideoOnProjector ? 'ON' : 'OFF'}
        </Button>
        <Button
          size="sm"
          variant={playback?.showVideoControls ? 'secondary' : 'outline'}
          pressed={Boolean(playback?.showVideoControls)}
          onClick={onToggleShowVideoControls}
        >
          Video Controls {playback?.showVideoControls ? 'Shown' : 'Hidden'}
        </Button>
        <Button
          size="sm"
          variant={playback?.hideTitleOnProjector ? 'primary' : 'outline'}
          pressed={Boolean(playback?.hideTitleOnProjector)}
          onClick={onToggleHideTitle}
        >
          Hide Title {playback?.hideTitleOnProjector ? 'ON' : 'OFF'}
        </Button>
        <Button
          size="sm"
          variant={playback?.hideAnswerOnProjector ? 'primary' : 'outline'}
          pressed={Boolean(playback?.hideAnswerOnProjector)}
          onClick={onToggleHideAnswer}
        >
          Hide Answer {playback?.hideAnswerOnProjector ? 'ON' : 'OFF'}
        </Button>
      </div>
    </div>
  )
}

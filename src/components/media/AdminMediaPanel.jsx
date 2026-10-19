import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useGameState } from '../../hooks/useGameState.js'
import { useMediaPlaybackSync } from '../../hooks/useMediaPlaybackSync.js'
import { Button } from '../common/Button.jsx'
import { MediaPlaybackControls } from './MediaPlaybackControls.jsx'

export function AdminMediaPanel({ onNotify, compact = true }) {
  const {
    state,
    patchMediaPlayback,
    selectMediaForPlayback,
    toggleMediaPlaybackFlag,
  } = useGameState()

  const playback = state.mediaPlayback
  const selectedItem = useMemo(
    () => state.mediaLibrary?.find((m) => m.id === playback?.mediaId) ?? null,
    [state.mediaLibrary, playback?.mediaId],
  )

  const sync = useMediaPlaybackSync({
    item: selectedItem,
    playback,
    role: 'control',
    patchMediaPlayback,
  })

  const handlePlay = async () => {
    const result = await sync.play()
    if (!result.ok) onNotify?.(result.error, 'warning')
    else onNotify?.(result.message ?? 'Playback started.', 'success')
  }

  const togglePlaybackMode = () => {
    const next = playback?.playbackMode === 'video' ? 'audio' : 'video'
    patchMediaPlayback(
      { playbackMode: next, syncSeq: Date.now() },
      { command: true },
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Media playback
        </p>
        <Link to="/media">
          <Button size="sm" variant="ghost">Music Library</Button>
        </Link>
      </div>

      <p className="text-[10px] text-slate-500">
        Single decoder on the projector tab — admin sends transport commands only.
      </p>

      <label className="block text-xs text-slate-400">
        Selected for playback
        <select
          className="mt-0.5 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white"
          value={playback?.mediaId ?? ''}
          onChange={(e) => {
            const id = e.target.value
            if (!id) return
            const result = selectMediaForPlayback(id)
            if (!result.success) onNotify?.(result.error, 'error')
          }}
        >
          <option value="">— Select media —</option>
          {state.mediaLibrary?.map((m) => (
            <option key={m.id} value={m.id} disabled={!m.offlineReady && m.source !== 'external'}>
              {m.displayTitle} ({m.mediaType})
              {!m.offlineReady && m.source !== 'external' ? ' — not ready' : ''}
            </option>
          ))}
        </select>
      </label>

      <MediaPlaybackControls
        item={selectedItem}
        playback={playback}
        compact={compact}
        onPlay={handlePlay}
        onPause={sync.pause}
        onStop={sync.stop}
        onSeek={sync.seek}
        onVolume={sync.setVolume}
        onTogglePlaybackMode={togglePlaybackMode}
        onToggleShowVideo={() => toggleMediaPlaybackFlag('showVideoOnProjector')}
        onToggleShowVideoControls={() => toggleMediaPlaybackFlag('showVideoControls')}
        onToggleHideTitle={() => toggleMediaPlaybackFlag('hideTitleOnProjector')}
        onToggleHideAnswer={() => toggleMediaPlaybackFlag('hideAnswerOnProjector')}
      />

      <p className="text-[10px] text-slate-600">
        Media blobs stay in IndexedDB on this browser. Clearing site data removes
        imports — keep original files as backup.
      </p>
    </div>
  )
}

import { Button } from '../../common/Button.jsx'

/**
 * Host control for projector video audio only (not intro/buzzer).
 */
export function VideoSoundControls({ videoMuted, soundBlocked, onSetMuted, compact = false }) {
  const soundOn = !videoMuted
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md border border-slate-600 bg-slate-900/60 ${
        compact ? 'px-2 py-1' : 'px-3 py-2'
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Video Sound
      </span>
      <Button
        size="sm"
        variant={soundOn ? 'gold' : 'outline'}
        pressed={soundOn}
        onClick={() => onSetMuted(false)}
      >
        Sound ON
      </Button>
      <Button
        size="sm"
        variant={!soundOn ? 'secondary' : 'outline'}
        pressed={!soundOn}
        onClick={() => onSetMuted(true)}
      >
        Muted
      </Button>
      {soundBlocked && soundOn && (
        <span className="text-[10px] text-amber-200/90">
          Browser blocked autoplay — use Enable on projector or tap Play below.
        </span>
      )}
    </div>
  )
}

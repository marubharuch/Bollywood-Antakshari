import { useState } from 'react'
import { Button } from '../../common/Button.jsx'

export function IntroSettingsMenu({
  presentation,
  introPlaying,
  onToggleSound,
  onSkip,
  onReplayGrand,
  onReplayRound,
  onToggleAutoRound,
  onVolumeChange,
  onNotify,
}) {
  const [open, setOpen] = useState(false)
  const soundOn = presentation?.soundEnabled !== false
  const autoRound = presentation?.autoRoundIntro !== false
  const vol = presentation?.volume ?? 0.75

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        pressed={open}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Intro Settings{introPlaying ? ' · playing' : ''}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-[min(100vw-2rem,16rem)] rounded-md border border-slate-700 bg-slate-900 p-2 shadow-lg"
        >
          <div className="flex flex-col gap-1">
            <Button size="sm" variant="ghost" onClick={() => onToggleSound(!soundOn)}>
              Sound {soundOn ? 'ON' : 'OFF'}
            </Button>
            <Button size="sm" variant="ghost" disabled={!introPlaying} onClick={onSkip}>
              Skip Intro
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const r = onReplayGrand()
                if (r && !r.success) onNotify(r.error ?? 'Cannot replay opening.', 'warning')
              }}
            >
              Replay Opening
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const r = onReplayRound()
                if (r && !r.success) onNotify(r.error ?? 'Cannot replay round intro.', 'warning')
              }}
            >
              Replay Round Intro
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onToggleAutoRound(!autoRound)}>
              Auto round intro {autoRound ? 'ON' : 'OFF'}
            </Button>
            <label className="mt-1 flex items-center gap-2 px-1 text-[11px] text-slate-400">
              Volume
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vol}
                className="h-1.5 flex-1 accent-violet-500"
                onChange={(e) => onVolumeChange(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

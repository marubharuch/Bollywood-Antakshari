import { Button } from '../common/Button.jsx'
import { Badge } from '../common/Badge.jsx'

export function IntroControlsPanel({
  presentation,
  introPlaying,
  onToggleSound,
  onSkip,
  onReplayGrand,
  onReplayRound,
  onToggleAutoRound,
  onVolumeChange,
  compact = false,
}) {
  const soundOn = presentation?.soundEnabled !== false
  const autoRound = presentation?.autoRoundIntro !== false
  const vol = presentation?.volume ?? 0.75

  return (
    <section
      className={`rounded-md border border-violet-800/40 bg-violet-950/20 ${
        compact ? 'p-2' : 'p-3'
      }`}
      aria-label="Cinematic intro controls"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-200/90">
          Intros
        </span>
        {introPlaying && <Badge tone="live">Playing</Badge>}
        <Button
          size="sm"
          variant={soundOn ? 'secondary' : 'outline'}
          pressed={soundOn}
          onClick={() => onToggleSound(!soundOn)}
        >
          Sound {soundOn ? 'ON' : 'OFF'}
        </Button>
        <Button size="sm" variant="outline" disabled={!introPlaying} onClick={onSkip}>
          Skip Intro
        </Button>
        <Button size="sm" variant="ghost" onClick={onReplayGrand}>
          Replay Opening
        </Button>
        <Button size="sm" variant="ghost" onClick={onReplayRound}>
          Replay Round Intro
        </Button>
        <Button
          size="sm"
          variant={autoRound ? 'primary' : 'outline'}
          pressed={autoRound}
          onClick={() => onToggleAutoRound(!autoRound)}
        >
          Auto round intro {autoRound ? 'ON' : 'OFF'}
        </Button>
      </div>
      {!compact && (
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
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
      )}
    </section>
  )
}

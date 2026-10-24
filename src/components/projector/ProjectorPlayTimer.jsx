export function ProjectorPlayTimer({ playTimer, compact = false }) {
  if (!playTimer?.projectorVisible) return null
  const remaining = playTimer.remainingSeconds ?? 0
  const running = Boolean(playTimer.running)
  const locked = Boolean(playTimer.locked)
  const urgent = remaining <= 3 && remaining > 0 && running
  const label = locked ? "Time's up" : running ? 'Time' : 'Paused'

  if (compact) {
    return (
      <div
        className={`projector-timer-strip rounded-md border px-2.5 py-1 ${
          urgent ? 'border-red-400 bg-red-950/50' : 'border-amber-500/40 bg-amber-950/30'
        }`}
        aria-live="polite"
      >
        <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-amber-200/90">
          {label}
        </span>
        <span className="text-[clamp(1rem,2.8vh,1.5rem)] font-black tabular-nums leading-none text-white">
          {remaining}s
        </span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border px-4 py-1.5 text-center ${
        urgent ? 'border-red-400 bg-red-950/50' : 'border-amber-500/40 bg-amber-950/30'
      }`}
      aria-live="polite"
    >
      <p className="text-[0.65rem] uppercase tracking-widest text-amber-200/90">{label}</p>
      <p className="text-[clamp(1.25rem,4vh,2.25rem)] font-black tabular-nums leading-tight text-white">
        {remaining}s
      </p>
      {!running && !locked && (
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-amber-200/90">
          Paused
        </p>
      )}
    </div>
  )
}

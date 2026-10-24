export function ProjectorTeamTurn({ teamName, manual, compact = false }) {
  if (!teamName || manual) return null
  if (compact) {
    return (
      <div className="projector-team-turn-strip rounded-md border border-amber-500/30 bg-amber-950/25 px-2.5 py-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-amber-200/80">
          Turn
        </span>
        <span className="text-[clamp(0.75rem,1.8vw,1.05rem)] font-bold leading-tight text-white break-words">
          {teamName}
        </span>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-4 py-1.5 text-center">
      <p className="text-[0.65rem] uppercase tracking-widest text-amber-200/80">
        {manual ? 'Manual selection' : 'Team turn'}
      </p>
      <p className="text-[clamp(0.95rem,2.8vh,1.5rem)] font-bold leading-tight text-white break-words">
        {teamName}
      </p>
    </div>
  )
}

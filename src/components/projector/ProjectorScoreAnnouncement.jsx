import { isScoreAnnouncementProjectorVisible } from '../../features/presentation/scoreAnnouncementModel.js'

export function ProjectorScoreAnnouncement({ announcement }) {
  if (!isScoreAnnouncementProjectorVisible(announcement)) return null

  const delta = announcement.delta ?? 0
  const isZero = delta === 0
  const positive = delta > 0
  const magnitude = Math.abs(delta)
  const sign = isZero ? '' : positive ? '+' : '−'

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[12%] z-[90] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`max-w-[min(100%,36rem)] rounded-2xl border px-4 py-3 text-center shadow-2xl backdrop-blur-md sm:px-6 sm:py-4 ${
          isZero
            ? 'border-slate-400/40 bg-slate-950/85'
            : positive
              ? 'border-emerald-400/40 bg-emerald-950/85'
              : 'border-rose-400/40 bg-rose-950/85'
        }`}
      >
        <p
          className="font-bold uppercase tracking-[0.15em] text-white break-words"
          style={{ fontSize: 'clamp(1.1rem, 4vw, 2.25rem)' }}
        >
          {announcement.teamName}
        </p>
        <p
          className={`mt-1 font-black tabular-nums ${
            isZero ? 'text-slate-200' : positive ? 'text-emerald-300' : 'text-rose-300'
          }`}
          style={{ fontSize: 'clamp(2rem, 8vw, 4.5rem)' }}
        >
          {isZero ? '0' : `${sign}${magnitude}`}
        </p>
        <p className="mt-2 text-slate-300" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.25rem)' }}>
          Total: <span className="font-semibold text-amber-200">{announcement.total}</span>
        </p>
      </div>
    </div>
  )
}

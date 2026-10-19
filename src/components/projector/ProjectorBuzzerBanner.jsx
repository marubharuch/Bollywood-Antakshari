export function ProjectorBuzzerBanner({ buzzer }) {
  if (!buzzer?.announcement) {
    return (
      <div
        className="rounded-xl border border-white/5 bg-white/5 px-6 py-4 text-center text-slate-500"
        aria-live="polite"
      >
        Buzzer standby
      </div>
    )
  }

  return (
    <div
      className="animate-buzzer-in rounded-xl border-2 border-[var(--color-gold)] bg-gradient-to-r from-rose-900/80 to-amber-900/60 px-8 py-6 text-center shadow-lg"
      role="status"
      aria-live="assertive"
    >
      <p className="text-sm uppercase tracking-widest text-amber-200">Buzzer</p>
      <p className="mt-2 text-3xl font-bold text-white md:text-4xl">
        {buzzer.announcement}
      </p>
    </div>
  )
}

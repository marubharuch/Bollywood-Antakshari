/** Public buzzer win only — no standby or placeholder copy on the projector. */
export function ProjectorBuzzerBanner({ buzzer }) {
  if (!buzzer?.announcement) {
    return null
  }

  return (
    <div
      className="animate-buzzer-in rounded-lg border-2 border-[var(--color-gold)] bg-gradient-to-r from-rose-900/80 to-amber-900/60 px-4 py-2 text-center shadow-lg"
      role="status"
      aria-live="assertive"
    >
      <p className="text-sm uppercase tracking-widest text-amber-200">Buzzer</p>
      <p
        className="mt-1 font-bold text-white break-words"
        style={{ fontSize: 'clamp(1.1rem, 4vh, 2rem)' }}
      >
        {buzzer.announcement}
      </p>
    </div>
  )
}

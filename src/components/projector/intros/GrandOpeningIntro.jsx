import { useEffect, useMemo, useState } from 'react'
import { GRAND_INTRO_MS } from '../../../features/presentation/introModel.js'
import './introAnimations.css'

const PHASES = [
  { at: 0, key: 'dark' },
  { at: 3000, key: 'stage' },
  { at: 9000, key: 'presents' },
  { at: 15000, key: 'title' },
  { at: 21000, key: 'tagline' },
]

export function GrandOpeningIntro({
  durationMs,
  reducedMotion,
  onComplete,
  animate = true,
  frozenElapsed = null,
}) {
  const total = durationMs ?? GRAND_INTRO_MS
  const [elapsed, setElapsed] = useState(() =>
    typeof frozenElapsed === 'number' ? frozenElapsed : 0,
  )

  const phase = useMemo(() => {
    const scaled = PHASES.map((p) => ({
      ...p,
      at: reducedMotion ? p.at * 0.35 : p.at,
    }))
    const e = typeof frozenElapsed === 'number' ? frozenElapsed : elapsed
    let current = 'dark'
    for (const p of scaled) {
      if (e >= p.at) current = p.key
    }
    return current
  }, [elapsed, frozenElapsed, reducedMotion])

  useEffect(() => {
    if (!animate || typeof frozenElapsed === 'number') {
      setElapsed(typeof frozenElapsed === 'number' ? frozenElapsed : 0)
      return undefined
    }
    setElapsed(0)
    const start = performance.now()
    let frame
    const tick = (now) => {
      const e = now - start
      setElapsed(e)
      if (e >= total) {
        onComplete?.()
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [animate, total, onComplete, frozenElapsed])

  const particles = useMemo(
    () =>
      Array.from({ length: reducedMotion ? 6 : 18 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        delay: `${(i % 5) * 0.7}s`,
        size: 4 + (i % 4),
      })),
    [reducedMotion],
  )

  const showParticles = animate && phase !== 'dark'

  return (
    <div className="intro-stage-root flex flex-col items-center justify-center px-6 text-center">
      {showParticles && <div className="intro-spotlight" aria-hidden />}
      {showParticles &&
        particles.map((p) => (
          <span
            key={p.id}
            className="intro-particle"
            style={{ left: p.left, animationDelay: p.delay, width: p.size, height: p.size }}
            aria-hidden
          />
        ))}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#4c0519_0%,_#030208_55%)] opacity-90"
        aria-hidden
      />

      {(phase === 'stage' || phase === 'presents' || phase === 'title' || phase === 'tagline') && (
        <div
          className="absolute bottom-0 h-32 w-full bg-gradient-to-t from-amber-500/20 to-transparent"
          style={{ animation: animate ? 'intro-pulse-glow 3s ease-in-out infinite' : undefined }}
          aria-hidden
        />
      )}

      {phase === 'presents' && (
        <p
          className="intro-gold-text intro-title-round-sub relative z-10 font-light tracking-[0.35em]"
          style={animate ? { animation: 'intro-title-rise 1.2s ease-out forwards' } : undefined}
        >
          DHRUV SHAH PRESENTS
        </p>
      )}

      {phase === 'title' && (
        <h1
          className="intro-gold-text intro-title-grand relative z-10 font-black uppercase leading-tight"
          style={animate ? { animation: 'intro-title-rise 1.4s ease-out forwards' } : undefined}
        >
          Bollywood
          <br />
          Antakshari
        </h1>
      )}

      {phase === 'tagline' && (
        <p
          className="intro-gold-text intro-title-round-main relative z-10 mt-4 font-bold tracking-widest"
          style={animate ? { animation: 'intro-title-rise 1s ease-out forwards' } : undefined}
        >
          LET THE MUSIC BATTLE BEGIN!
        </p>
      )}

      {phase === 'dark' && (
        <p className="relative z-10 text-xs uppercase tracking-[0.5em] text-rose-900/80">
          …
        </p>
      )}
    </div>
  )
}

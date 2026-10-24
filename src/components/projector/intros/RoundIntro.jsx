import { useEffect, useState } from 'react'
import { ROUND_INTRO_MS } from '../../../features/presentation/introModel.js'
import './introAnimations.css'

export function RoundIntro({ stageLine, roundLine, durationMs, reducedMotion, onComplete }) {
  const total = durationMs ?? ROUND_INTRO_MS
  const [showStage, setShowStage] = useState(false)
  const [showRound, setShowRound] = useState(false)

  useEffect(() => {
    const s1 = reducedMotion ? 400 : 2000
    const s2 = reducedMotion ? 1200 : 4500
    const t1 = window.setTimeout(() => setShowStage(true), s1)
    const t2 = window.setTimeout(() => setShowRound(true), s2)
    const done = window.setTimeout(() => onComplete?.(), total)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(done)
    }
  }, [total, reducedMotion, onComplete])

  return (
    <div className="intro-stage-root flex flex-col items-center justify-center px-6 text-center">
      <div className="intro-spotlight" style={{ animationDuration: '8s' }} aria-hidden />
      <div
        className="absolute h-64 w-64 rounded-full border-2 border-amber-400/30"
        style={{ animation: 'intro-ring-spin 3s ease-out forwards' }}
        aria-hidden
      />

      {showStage && (
        <p
          className="intro-gold-text intro-title-round-main relative z-10 font-semibold tracking-[0.25em] break-words"
          style={{ animation: 'intro-title-rise 0.8s ease-out forwards' }}
        >
          {stageLine}
        </p>
      )}
      {showRound && (
        <p
          className="intro-gold-text intro-title-round-sub relative z-10 mt-4 font-bold tracking-[0.2em] break-words"
          style={{ animation: 'intro-title-rise 0.8s ease-out forwards' }}
        >
          {roundLine}
        </p>
      )}
    </div>
  )
}

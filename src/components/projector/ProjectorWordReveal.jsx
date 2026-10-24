import { useEffect, useMemo, useRef, useState } from 'react'
import './projectorWordReveal.css'

const SCRAMBLE_DURATION_MS = 2600
const TICK_MS = 70

const SCRAMBLE_POOL = [
  'અ', 'આ', 'ઇ', 'ઈ', 'ઉ', 'ઊ', 'એ', 'ઐ', 'ઓ', 'ઔ', 'ક', 'ખ', 'ગ', 'ઘ', 'ચ', 'છ', 'જ', 'ઝ', 'ટ', 'ડ', 'ત', 'થ', 'દ', 'ધ', 'ન', 'પ', 'ફ', 'બ', 'ભ', 'મ', 'ય', 'ર', 'લ', 'વ', 'શ', 'ષ', 'સ', 'હ',
  'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ', 'ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह',
  '₹', '★', '✦', '◎', '#', '@', '%', '&',
]

function randomScrambleText(length = 8) {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)]
  }
  return out
}

function hashRevealKey(key) {
  const s = String(key ?? '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/**
 * Game-show word reveal for શબ્દ (WORD) rounds. Runs once per `revealKey`.
 * @param {string} revealKey stable id per live question (e.g. library question id)
 * @param {string} word target word — not shown until scramble completes
 */
export function ProjectorWordReveal({ revealKey, word }) {
  const trimmed = (word ?? '').trim()
  const [phase, setPhase] = useState('idle')
  const [scrambleDisplay, setScrambleDisplay] = useState('')
  const tickRef = useRef(null)
  const timeoutRef = useRef(null)

  const variant = useMemo(() => hashRevealKey(revealKey) % 3, [revealKey])
  const scrambleLen = useMemo(
    () => Math.min(14, Math.max(6, Math.round(trimmed.length * 1.4) || 8)),
    [trimmed.length],
  )

  const particles = useMemo(() => {
    const seed = hashRevealKey(`${revealKey}-p`)
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${((seed + i * 37) % 100).toFixed(1)}%`,
      top: `${((seed + i * 53) % 100).toFixed(1)}%`,
      delay: `${((i * 0.13) % 1.2).toFixed(2)}s`,
      duration: `${(1.6 + (i % 5) * 0.2).toFixed(2)}s`,
    }))
  }, [revealKey])

  useEffect(() => {
    if (!revealKey || !trimmed) {
      setPhase('idle')
      return undefined
    }

    setPhase('scramble')
    setScrambleDisplay(randomScrambleText(scrambleLen))

    tickRef.current = window.setInterval(() => {
      setScrambleDisplay(randomScrambleText(scrambleLen))
    }, TICK_MS)

    timeoutRef.current = window.setTimeout(() => {
      if (tickRef.current) window.clearInterval(tickRef.current)
      tickRef.current = null
      setPhase('revealed')
    }, SCRAMBLE_DURATION_MS)

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [revealKey, trimmed, scrambleLen])

  if (!trimmed || phase === 'idle') return null

  return (
    <div className="projector-word-reveal" aria-live="polite">
      <div className="projector-word-reveal__particles" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className="projector-word-reveal__particle"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {phase === 'scramble' && (
        <>
          <div className="projector-word-reveal__scanline" aria-hidden="true" />
          <div className="projector-word-reveal__scramble-wrap">
            <p
              className={`projector-word-reveal__scramble ${
                variant === 1 ? 'projector-word-reveal__scramble--glitch' : ''
              }`}
              aria-hidden="true"
            >
              {scrambleDisplay}
            </p>
          </div>
        </>
      )}

      {phase === 'revealed' && (
        <div className="projector-word-reveal__final-wrap">
          <div className="projector-word-reveal__final-ring" aria-hidden="true" />
          <p className="projector-word-reveal__final">{trimmed}</p>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useGameState } from '../../hooks/useGameState.js'
import {
  INTRO_KIND,
  INTRO_STATUS,
  introDurationMs,
  isGrandIntroActive,
  isIntroPlaying,
} from '../../features/presentation/introModel.js'
import { getIntroAudioEngine } from '../../features/presentation/introAudio.js'
import { GrandOpeningIntro } from './intros/GrandOpeningIntro.jsx'
import { RoundIntro } from './intros/RoundIntro.jsx'

export function ProjectorIntroLayer() {
  const { state, finishIntroPlayback } = useGameState()
  const presentation = state.presentation
  const intro = presentation?.intro
  const completedTokenRef = useRef(null)

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const playing = isIntroPlaying(presentation)
  const grandActive = isGrandIntroActive(presentation)
  const duration = introDurationMs(intro?.kind, reducedMotion)

  const handleComplete = useCallback(() => {
    if (!intro?.token || completedTokenRef.current === intro.token) return
    completedTokenRef.current = intro.token
    finishIntroPlayback()
  }, [intro?.token, finishIntroPlayback])

  useEffect(() => {
    const engine = getIntroAudioEngine()
    engine.setOptions({
      enabled: presentation?.soundEnabled,
      volume: presentation?.volume ?? 0.75,
    })
  }, [presentation?.soundEnabled, presentation?.volume])

  useEffect(() => {
    if (!playing || intro?.kind !== INTRO_KIND.GRAND) return
    completedTokenRef.current = null
    const engine = getIntroAudioEngine()
    engine.setOptions({
      enabled: presentation?.soundEnabled,
      volume: presentation?.volume ?? 0.75,
    })
    engine.resume().then(() => {
      engine.playGrandSequence(reducedMotion)
    })
    return () => engine.stopAll()
  }, [playing, intro?.token, intro?.kind, presentation?.soundEnabled, presentation?.volume, reducedMotion])

  useEffect(() => {
    if (!playing || intro?.kind !== INTRO_KIND.ROUND) return
    completedTokenRef.current = null
    const engine = getIntroAudioEngine()
    engine.setOptions({
      enabled: presentation?.soundEnabled,
      volume: presentation?.volume ?? 0.75,
    })
    engine.resume().then(() => {
      engine.playRoundSting(reducedMotion)
    })
    return () => engine.stopAll()
  }, [
    playing,
    intro?.token,
    intro?.kind,
    intro?.status,
    presentation?.soundEnabled,
    presentation?.volume,
    reducedMotion,
  ])

  if (intro?.kind === INTRO_KIND.GRAND && grandActive) {
    if (intro.status === INTRO_STATUS.READY) {
      return (
        <GrandOpeningIntro
          durationMs={duration}
          reducedMotion={reducedMotion}
          animate={false}
          frozenElapsed={0}
        />
      )
    }
    if (intro.status === INTRO_STATUS.PLAYING) {
      return (
        <GrandOpeningIntro
          key={intro.token}
          durationMs={duration}
          reducedMotion={reducedMotion}
          animate={true}
          onComplete={handleComplete}
        />
      )
    }
    if (intro.status === INTRO_STATUS.DONE) {
      const hold =
        typeof intro.holdElapsedMs === 'number'
          ? intro.holdElapsedMs
          : duration - 1
      return (
        <GrandOpeningIntro
          durationMs={duration}
          reducedMotion={reducedMotion}
          animate={false}
          frozenElapsed={hold}
        />
      )
    }
  }

  if (!playing) return null
  if (intro.kind === INTRO_KIND.ROUND) {
    return (
      <RoundIntro
        stageLine={intro.stageLine}
        roundLine={intro.roundLine}
        durationMs={duration}
        reducedMotion={reducedMotion}
        onComplete={handleComplete}
      />
    )
  }
  return null
}

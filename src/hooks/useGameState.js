import { useSyncExternalStore } from 'react'
import { gameStateStore } from '../state/gameStateStore.js'

export function useGameState() {
  const state = useSyncExternalStore(
    gameStateStore.subscribe,
    gameStateStore.getState,
    gameStateStore.getState,
  )

  return {
    state,
    adjustTeamScore: gameStateStore.adjustTeamScore,
    setSimulationMode: gameStateStore.setSimulationMode,
    startDemo: gameStateStore.startDemo,
    stopDemo: gameStateStore.stopDemo,
    resetDemo: gameStateStore.resetDemo,
    simulateBuzzerHit: gameStateStore.simulateBuzzerHit,
    clearBuzzer: gameStateStore.clearBuzzer,
    revealAnswer: gameStateStore.revealAnswer,
    toggleAnswerVisibility: gameStateStore.toggleAnswerVisibility,
    setState: gameStateStore.setState,
  }
}

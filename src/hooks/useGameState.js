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
    addTeam: gameStateStore.addTeam,
    updateTeam: gameStateStore.updateTeam,
    deleteTeam: gameStateStore.deleteTeam,
    saveRound: gameStateStore.saveRound,
    duplicateRound: gameStateStore.duplicateRound,
    deleteRound: gameStateStore.deleteRound,
    selectRound: gameStateStore.selectRound,
    toggleRoundActive: gameStateStore.toggleRoundActive,
    createEmptyRoundDraft: gameStateStore.createEmptyRoundDraft,
    patchMediaPlayback: gameStateStore.patchMediaPlayback,
    appendMediaLibraryItems: gameStateStore.appendMediaLibraryItems,
    updateMediaMetadata: gameStateStore.updateMediaMetadata,
    removeMediaFromLibrary: gameStateStore.removeMediaFromLibrary,
    selectMediaForPlayback: gameStateStore.selectMediaForPlayback,
    addExternalMediaLink: gameStateStore.addExternalMediaLink,
    toggleMediaPlaybackFlag: gameStateStore.toggleMediaPlaybackFlag,
    rehydrateFromPersistence: gameStateStore.rehydrateFromPersistence,
    prepareProjectorSession: gameStateStore.prepareProjectorSession,
    setState: gameStateStore.setState,
  }
}

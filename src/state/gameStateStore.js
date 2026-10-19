import {
  createInitialGameState,
  INITIAL_GAME_STATE,
  normalizeGameState,
} from './initialGameState.js'
import {
  loadPersistedGameState,
  publishGameState,
  subscribeToGameSync,
} from './sync/gameSync.js'

function mergeState(partial) {
  return {
    ...partial,
    updatedAt: Date.now(),
  }
}

function createStore() {
  const persisted = loadPersistedGameState()
  let state = persisted
    ? normalizeGameState(persisted)
    : normalizeGameState(INITIAL_GAME_STATE)
  const listeners = new Set()
  let simulationTimer = null

  const notify = () => {
    listeners.forEach((fn) => fn(state))
  }

  const setState = (updater, meta = {}) => {
    const patch =
      typeof updater === 'function' ? updater(state) : updater
    state = mergeState({ ...state, ...patch })
    publishGameState(state, meta)
    notify()
  }

  const getState = () => state

  const subscribe = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  subscribeToGameSync(({ state: remote }) => {
    state = normalizeGameState(remote)
    notify()
  })

  const adjustTeamScore = (teamId, delta) => {
    setState((prev) => ({
      ...prev,
      teams: prev.teams.map((t) =>
        t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t,
      ),
    }), { origin: 'admin' })
  }

  const setSimulationMode = (enabled) => {
    setState({ simulationMode: enabled }, { origin: 'admin' })
    if (!enabled) {
      clearSimulationTimer()
    } else if (state.demoActive) {
      startSimulationLoop()
    }
  }

  const clearSimulationTimer = () => {
    if (simulationTimer) {
      clearInterval(simulationTimer)
      simulationTimer = null
    }
  }

  const simulateBuzzerHit = () => {
    const teams = state.teams
    if (!teams.length) return
    const pick = teams[Math.floor(Math.random() * teams.length)]
    setState({
      buzzer: {
        status: 'active',
        announcement: `${pick.name} buzzed in!`,
        teamId: pick.id,
        teamName: pick.name,
      },
      eventStatus: state.demoActive ? 'demo' : state.eventStatus,
    }, { origin: 'simulation' })
  }

  const startSimulationLoop = () => {
    clearSimulationTimer()
    if (!state.simulationMode || !state.demoActive) return
    simulationTimer = setInterval(() => {
      if (getState().simulationMode && getState().demoActive) {
        simulateBuzzerHit()
      }
    }, 12000)
  }

  const startDemo = () => {
    setState({
      demoActive: true,
      eventStatus: 'demo',
      buzzer: {
        status: 'ready',
        announcement: null,
        teamId: null,
        teamName: null,
      },
    }, { origin: 'admin' })
    startSimulationLoop()
  }

  const stopDemo = () => {
    clearSimulationTimer()
    setState({
      demoActive: false,
      eventStatus: 'idle',
      buzzer: {
        status: 'idle',
        announcement: null,
        teamId: null,
        teamName: null,
      },
    }, { origin: 'admin' })
  }

  const toggleAnswerVisibility = () => {
    setState((prev) => ({
      question: {
        ...prev.question,
        answerRevealed: !prev.question?.answerRevealed,
      },
    }), { origin: 'admin' })
  }

  const resetDemo = () => {
    clearSimulationTimer()
    const keepSimulation = state.simulationMode
    state = normalizeGameState(
      createInitialGameState({ simulationMode: keepSimulation }),
    )
    publishGameState(state, { origin: 'admin' })
    notify()
    if (keepSimulation && state.demoActive) {
      startSimulationLoop()
    }
  }

  const clearBuzzer = () => {
    setState({
      buzzer: {
        status: 'idle',
        announcement: null,
        teamId: null,
        teamName: null,
      },
    }, { origin: 'admin' })
  }

  const revealAnswer = (revealed) => {
    setState((prev) => ({
      question: { ...prev.question, answerRevealed: revealed },
    }), { origin: 'admin' })
  }

  return {
    getState,
    subscribe,
    setState,
    adjustTeamScore,
    setSimulationMode,
    startDemo,
    stopDemo,
    resetDemo,
    simulateBuzzerHit,
    clearBuzzer,
    revealAnswer,
    toggleAnswerVisibility,
    destroy: clearSimulationTimer,
  }
}

export const gameStateStore = createStore()

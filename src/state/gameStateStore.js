import {
  createTeamId,
  DEFAULT_TOURNAMENT_TEAM_META,
  pickAvailableTeamColor,
} from '../features/tournament/teamModel.js'
import {
  validateTeamColor,
  validateTeamName,
} from '../features/tournament/teamValidation.js'
import {
  createEmptyRoundDraft,
  createRoundId,
  normalizeRound,
} from '../features/rounds/roundModel.js'
import { validateRoundDraft } from '../features/rounds/roundValidation.js'
import {
  createMediaId,
  DEFAULT_MEDIA_PLAYBACK,
  normalizeMediaItem,
  normalizeMediaLibrary,
  normalizeMediaPlayback,
} from '../features/media/mediaModel.js'
import {
  createInitialGameState,
  INITIAL_GAME_STATE,
  normalizeGameState,
} from './initialGameState.js'
import { mergeRemoteGameState } from './mergeGameState.js'
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
    state = mergeRemoteGameState(state, remote)
    notify()
  })

  const rehydrateFromPersistence = () => {
    const persisted = loadPersistedGameState()
    if (!persisted) return false
    state = mergeRemoteGameState(state, persisted)
    notify()
    return true
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        rehydrateFromPersistence()
      }
    })
  }

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
    const keepTeams = state.teams
    const keepRoundLibrary = state.roundLibrary
    const keepSelectedRoundId = state.selectedRoundId
    const keepMediaLibrary = state.mediaLibrary
    state = normalizeGameState({
      ...createInitialGameState({ simulationMode: keepSimulation }),
      teams: keepTeams,
      roundLibrary: keepRoundLibrary,
      selectedRoundId: keepSelectedRoundId,
      mediaLibrary: keepMediaLibrary,
      mediaPlayback: DEFAULT_MEDIA_PLAYBACK,
    })
    publishGameState(state, { origin: 'admin' })
    notify()
    if (keepSimulation && state.demoActive) {
      startSimulationLoop()
    }
  }

  const displayPatchFromRound = (prev, round) => {
    if (!round) return {}
    const prompt =
      round.instructions ||
      round.description ||
      'Follow the round rules on the admin display.'
    return {
      selectedRoundId: round.id,
      roundLabel: round.name,
      question: {
        ...prev.question,
        prompt,
        answerRevealed: false,
      },
    }
  }

  const saveRound = (draft) => {
    const normalized = normalizeRound(draft)
    const validation = validateRoundDraft(normalized, state.roundLibrary)
    if (!validation.valid) {
      return { success: false, errors: validation.errors, error: 'Fix validation errors.' }
    }

    const exists = state.roundLibrary.some((r) => r.id === normalized.id)
    const now = Date.now()
    const round = {
      ...normalized,
      name: validation.name ?? normalized.name,
      updatedAt: now,
      createdAt: exists ? normalized.createdAt : now,
    }

    const roundLibrary = exists
      ? state.roundLibrary.map((r) => (r.id === round.id ? round : r))
      : [...state.roundLibrary, round]

    setState((prev) => {
      const patch = { roundLibrary }
      if (prev.selectedRoundId === round.id) {
        Object.assign(patch, displayPatchFromRound(prev, round))
      }
      return patch
    }, { origin: 'rounds' })
    return { success: true, round, created: !exists }
  }

  const duplicateRound = (roundId) => {
    const source = state.roundLibrary.find((r) => r.id === roundId)
    if (!source) {
      return { success: false, error: 'Round not found.' }
    }
    const copy = normalizeRound({
      ...source,
      id: createRoundId(),
      name: `${source.name} (Copy)`,
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    setState({ roundLibrary: [...state.roundLibrary, copy] }, { origin: 'rounds' })
    return { success: true, round: copy }
  }

  const deleteRound = (roundId) => {
    const existing = state.roundLibrary.find((r) => r.id === roundId)
    if (!existing) {
      return { success: false, error: 'Round not found.' }
    }
    const patch = {
      roundLibrary: state.roundLibrary.filter((r) => r.id !== roundId),
    }
    if (state.selectedRoundId === roundId) {
      patch.selectedRoundId = null
    }
    setState(patch, { origin: 'rounds' })
    return { success: true, round: existing }
  }

  const selectRound = (roundId) => {
    const round = state.roundLibrary.find((r) => r.id === roundId)
    if (!round) {
      return { success: false, error: 'Round not found.' }
    }
    if (!round.active) {
      return { success: false, error: 'This round is inactive. Activate it first.' }
    }
    setState((prev) => displayPatchFromRound(prev, round), { origin: 'rounds' })
    return { success: true, round }
  }

  const toggleRoundActive = (roundId) => {
    const round = state.roundLibrary.find((r) => r.id === roundId)
    if (!round) {
      return { success: false, error: 'Round not found.' }
    }
    const next = { ...round, active: !round.active, updatedAt: Date.now() }
    return saveRound(next)
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

  const buzzerClearPatchIfTeam = (prev, teamId) => {
    if (prev.buzzer?.teamId !== teamId) return {}
    return {
      buzzer: {
        status: 'idle',
        announcement: null,
        teamId: null,
        teamName: null,
      },
    }
  }

  const addTeam = (name, accent) => {
    const validation = validateTeamName(name, state.teams)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    let color = accent
    if (color) {
      const colorCheck = validateTeamColor(color)
      if (!colorCheck.valid) {
        return { success: false, error: colorCheck.error }
      }
      color = colorCheck.color
    } else {
      color = pickAvailableTeamColor(state.teams)
    }

    const team = {
      id: createTeamId(),
      name: validation.name,
      score: 0,
      accent: color,
      tournament: { ...DEFAULT_TOURNAMENT_TEAM_META },
    }

    setState({ teams: [...state.teams, team] }, { origin: 'teams' })
    return { success: true, team }
  }

  const updateTeam = (teamId, updates) => {
    const existing = state.teams.find((t) => t.id === teamId)
    if (!existing) {
      return { success: false, error: 'Team not found.' }
    }

    let nextName = existing.name
    if (updates.name !== undefined) {
      const validation = validateTeamName(updates.name, state.teams, teamId)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }
      nextName = validation.name
    }

    let nextAccent = existing.accent
    if (updates.accent !== undefined) {
      const colorCheck = validateTeamColor(updates.accent)
      if (!colorCheck.valid) {
        return { success: false, error: colorCheck.error }
      }
      nextAccent = colorCheck.color
    }

    setState((prev) => ({
      teams: prev.teams.map((t) =>
        t.id === teamId
          ? {
              ...t,
              name: nextName,
              accent: nextAccent,
              score: t.score,
              tournament: t.tournament ?? { ...DEFAULT_TOURNAMENT_TEAM_META },
            }
          : t,
      ),
      ...(prev.buzzer?.teamId === teamId
        ? {
            buzzer: {
              ...prev.buzzer,
              teamName: nextName,
              announcement: prev.buzzer.announcement
                ? prev.buzzer.announcement.replace(existing.name, nextName)
                : null,
            },
          }
        : {}),
    }), { origin: 'teams' })

    return { success: true, team: { ...existing, name: nextName, accent: nextAccent } }
  }

  const deleteTeam = (teamId) => {
    const existing = state.teams.find((t) => t.id === teamId)
    if (!existing) {
      return { success: false, error: 'Team not found.' }
    }

    setState((prev) => ({
      teams: prev.teams.filter((t) => t.id !== teamId),
      ...buzzerClearPatchIfTeam(prev, teamId),
    }), { origin: 'teams' })

    return { success: true, team: existing }
  }

  const patchMediaPlayback = (patch, options = {}) => {
    const bumpSeq =
      options.command === true ||
      Object.prototype.hasOwnProperty.call(patch, 'syncSeq')
    setState((prev) => ({
      mediaPlayback: {
        ...normalizeMediaPlayback(prev.mediaPlayback),
        ...patch,
        ...(bumpSeq ? { syncSeq: patch.syncSeq ?? Date.now() } : {}),
      },
    }), { origin: 'media' })
  }

  const appendMediaLibraryItems = (items) => {
    const normalized = items.map((item) => normalizeMediaItem(item)).filter(Boolean)
    if (!normalized.length) return { success: true, added: 0 }
    setState((prev) => ({
      mediaLibrary: normalizeMediaLibrary([...prev.mediaLibrary, ...normalized]),
    }), { origin: 'media' })
    return { success: true, added: normalized.length }
  }

  const updateMediaMetadata = (mediaId, updates) => {
    const existing = state.mediaLibrary.find((m) => m.id === mediaId)
    if (!existing) return { success: false, error: 'Media not found.' }
    const next = normalizeMediaItem({ ...existing, ...updates, id: mediaId })
    setState((prev) => ({
      mediaLibrary: prev.mediaLibrary.map((m) => (m.id === mediaId ? next : m)),
    }), { origin: 'media' })
    return { success: true, item: next }
  }

  const removeMediaFromLibrary = (mediaId) => {
    const existing = state.mediaLibrary.find((m) => m.id === mediaId)
    if (!existing) return { success: false, error: 'Media not found.' }
    setState((prev) => {
      const mediaLibrary = prev.mediaLibrary.filter((m) => m.id !== mediaId)
      const stopCurrent = prev.mediaPlayback?.mediaId === mediaId
      return {
        mediaLibrary,
        mediaPlayback: stopCurrent
          ? { ...DEFAULT_MEDIA_PLAYBACK, volume: prev.mediaPlayback.volume }
          : prev.mediaPlayback,
      }
    }, { origin: 'media' })
    return { success: true, item: existing }
  }

  const selectMediaForPlayback = (mediaId) => {
    const item = state.mediaLibrary.find((m) => m.id === mediaId)
    if (!item) return { success: false, error: 'Media not found.' }
    patchMediaPlayback(
      {
        mediaId,
        status: 'stopped',
        currentTime: 0,
        duration: 0,
        error: null,
        playbackMode: item.mediaType === 'video' ? 'video' : 'audio',
        syncSeq: Date.now(),
      },
      { command: true },
    )
    return { success: true, item }
  }

  const addExternalMediaLink = (url, displayTitle) => {
    const trimmed = (url ?? '').trim()
    if (!trimmed) return { success: false, error: 'URL is required.' }
    if (!/^https?:\/\//i.test(trimmed)) {
      return { success: false, error: 'URL must start with http:// or https://' }
    }
    const isVideo = /\.mp4(\?|$)/i.test(trimmed)
    const item = normalizeMediaItem({
      id: createMediaId(),
      displayTitle: (displayTitle ?? '').trim() || trimmed,
      originalFileName: trimmed,
      externalUrl: trimmed,
      source: 'external',
      offlineReady: false,
      mediaType: isVideo ? 'video' : 'audio',
      mimeType: isVideo ? 'video/mp4' : 'audio/mpeg',
    })
    setState((prev) => ({
      mediaLibrary: [...prev.mediaLibrary, item],
    }), { origin: 'media' })
    return { success: true, item }
  }

  const toggleMediaPlaybackFlag = (key) => {
    const current = state.mediaPlayback?.[key]
    patchMediaPlayback({ [key]: !current, syncSeq: Date.now() }, { command: true })
  }

  const prepareProjectorSession = () => {
    rehydrateFromPersistence()
    const pb = getState().mediaPlayback
    let pausedForReload = false
    if (pb?.status === 'playing') {
      patchMediaPlayback(
        {
          status: 'paused',
          error: null,
          syncSeq: Date.now(),
        },
        { command: true },
      )
      pausedForReload = true
    }
    return { pausedForReload }
  }

  return {
    getState,
    subscribe,
    setState,
    rehydrateFromPersistence,
    prepareProjectorSession,
    adjustTeamScore,
    setSimulationMode,
    startDemo,
    stopDemo,
    resetDemo,
    simulateBuzzerHit,
    clearBuzzer,
    revealAnswer,
    toggleAnswerVisibility,
    addTeam,
    updateTeam,
    deleteTeam,
    saveRound,
    duplicateRound,
    deleteRound,
    selectRound,
    toggleRoundActive,
    createEmptyRoundDraft,
    patchMediaPlayback,
    appendMediaLibraryItems,
    updateMediaMetadata,
    removeMediaFromLibrary,
    selectMediaForPlayback,
    addExternalMediaLink,
    toggleMediaPlaybackFlag,
    destroy: clearSimulationTimer,
  }
}

export const gameStateStore = createStore()

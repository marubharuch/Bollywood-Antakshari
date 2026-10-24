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
import {
  validateRoundDraft,
  validateRoundHasPlayableQuestions,
} from '../features/rounds/roundValidation.js'
import {
  createMediaId,
  DEFAULT_MEDIA_PLAYBACK,
  normalizeMediaItem,
  normalizeMediaLibrary,
  normalizeMediaPlayback,
} from '../features/media/mediaModel.js'
import {
  applyTournamentImportPackage,
  validateTournamentImportPackage,
} from '../features/migration/tournamentImportModel.js'
import {
  buildTournamentExportPackage,
} from '../features/migration/tournamentExportModel.js'
import {
  auditMediaLibraryOfflineStatus,
  importMediaFileWithStableId,
} from '../features/migration/mediaRelink.js'
import { getMediaBlob } from '../features/media/mediaDb.js'
import {
  buildPlannedRoundsFromStageProfile,
  defaultQuestionCountForRound,
  normalizeStageProfile,
  normalizeStageProfileSlot,
  validateStageProfile,
} from '../features/tournament/stageProfileModel.js'
import { allocateQuestionsForInstance } from '../features/tournament/questionAllocation.js'
import {
  applyTournamentInstanceBundle,
  captureTournamentInstanceFromState,
  commitActiveTournamentInstance,
  createEmptyTournamentInstanceBundle,
  normalizeTournamentInstanceBundle,
} from '../features/tournament/tournamentInstanceModel.js'
import { migrateGameStateToMultiTournament } from '../features/tournament/tournamentStateMigration.js'
import { syncTournamentInstancesFromStageProfiles } from '../features/tournament/syncInstancesFromStageProfiles.js'
import { normalizeQuestionBankRoundSelection } from '../features/questionBank/questionBankModel.js'
import {
  getTournamentInstanceDef,
  TOURNAMENT_INSTANCE_DEFS,
} from '../features/tournament/tournamentRegistry.js'
import {
  describeDeactivatedQuarterFinalsWithProgress,
  isInstanceActiveForEvent,
  normalizeTournamentEventSettings,
} from '../features/tournament/tournamentEventModel.js'
import { normalizeBuzzer, normalizeBuzzerSystem } from '../features/buzzer/buzzerModel.js'
import {
  ANCHOR_STEPS,
  buildQuestionQueue,
  createFreshPlayTimer,
  createBuzzerAnswerTimer,
  createPlannedRound,
  findNextQuestionIndex,
  getNextTeamFromRotation,
  normalizePlaySession,
  normalizePlaySettings,
  normalizePlayTimer,
  normalizeTournament,
  normalizeTournamentPlans,
  QUESTION_STATUS,
  ROUND_PLAY_STATUS,
  upsertTournamentPlan,
  getActiveRoundSnapshot,
  validateTournamentConfig,
} from '../features/tournament/tournamentModel.js'
import {
  canCompleteTournament,
  canPauseTournament,
  canResumePausedTournament,
  canResumeStoppedTournament,
  canStopTournament,
  TOURNAMENT_STATUS,
  tournamentPlayBlockedReason,
} from '../features/tournament/tournamentLifecycle.js'
import {
  buildRoundIntroLines,
  createIntroToken,
  GRAND_INTRO_MS,
  INTRO_KIND,
  INTRO_STATUS,
  isIntroPlaying,
  normalizeIntroPlayback,
  normalizePresentation,
} from '../features/presentation/introModel.js'
import {
  normalizeScoreDisplay,
  SCORE_DISPLAY_MODE,
} from '../features/presentation/scoreDisplayModel.js'
import {
  createScoreAnnouncement,
  isScoreAnnouncementActive,
  normalizeScoreAnnouncement,
} from '../features/presentation/scoreAnnouncementModel.js'
import { questionScoreRequired } from '../features/tournament/roundSequence.js'
import { getIntroAudioEngine } from '../features/presentation/introAudio.js'
import { buildPostRoundIntroGameplayPatch } from '../features/tournament/roundGameplay.js'
import {
  applyTeamRoundScoreDelta,
  getTeamRoundScore,
  setTeamRoundScore,
} from '../features/tournament/roundScoreLedger.js'
import { ROUND_PLAY_TYPE, resolveRoundPlayType } from '../features/rounds/roundPlayType.js'
import {
  normalizeScorePresentation,
  SCORE_PRESENTATION_KIND,
  SCORE_PRESENTATION_PHASE,
  teamOrderForRoundReveal,
} from '../features/presentation/scorePresentationModel.js'
import {
  normalizeLibraryQuestion,
  normalizeQuestionLibrary,
} from '../features/questionLibrary/questionLibraryModel.js'
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

  const syncTournamentPlansFromInstances = (instances) =>
    TOURNAMENT_INSTANCE_DEFS.map((d) =>
      normalizeTournament(instances?.[d.id]?.tournament ?? { id: d.id, name: d.name }),
    )

  const setState = (updater, meta = {}) => {
    const patch = typeof updater === 'function' ? updater(state) : updater
    let next = mergeState({ ...state, ...patch })
    next = commitActiveTournamentInstance(next)
    if (next.tournamentInstances) {
      next = {
        ...next,
        tournamentPlans: syncTournamentPlansFromInstances(next.tournamentInstances),
      }
    }
    state = migrateGameStateToMultiTournament(next)
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
      buzzer: normalizeBuzzer({
        status: 'active',
        announcement: `${pick.name} buzzed in!`,
        teamId: pick.id,
        teamName: pick.name,
        source: 'demo',
      }),
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
      buzzer: normalizeBuzzer({ status: 'ready', source: 'demo' }),
    }, { origin: 'admin' })
    startSimulationLoop()
  }

  const stopDemo = () => {
    clearSimulationTimer()
    setState((prev) => ({
      demoActive: false,
      eventStatus:
        prev.tournament?.status === TOURNAMENT_STATUS.IN_PROGRESS ? 'live' : 'idle',
      buzzer: normalizeBuzzer({ status: 'idle', source: 'manual' }),
    }), { origin: 'admin' })
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

  const upsertQuestionLibraryEntry = (entry) => {
    const question = normalizeLibraryQuestion(entry)
    if (!question) return { success: false, error: 'Invalid question.' }
    setState((prev) => {
      const list = normalizeQuestionLibrary(prev.questionLibrary ?? [])
      const idx = list.findIndex((q) => q.id === question.id)
      const next =
        idx >= 0
          ? list.map((q, i) => (i === idx ? question : q))
          : [...list, question]
      return { questionLibrary: next }
    }, { origin: 'rounds' })
    return { success: true, question }
  }

  const saveRound = (draft) => {
    const normalized = normalizeRound(draft)
    const validation = validateRoundDraft(
      normalized,
      state.roundLibrary,
      state.questionLibrary ?? [],
    )
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
      assignmentQuestionIds: [...(source.assignmentQuestionIds ?? [])],
      questions: [],
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
    setState((prev) => ({
      buzzer: normalizeBuzzer({
        ...prev.buzzer,
        status: 'idle',
        announcement: null,
        teamId: null,
        teamName: null,
      }),
    }), { origin: 'admin' })
  }

  const setBuzzerSystemEnabled = (enabled) => {
    const on = Boolean(enabled)
    setState({
      buzzerSystem: normalizeBuzzerSystem({
        ...state.buzzerSystem,
        enabled: on,
        showQrOnProjector: on ? state.buzzerSystem?.showQrOnProjector : false,
      }),
    }, { origin: 'admin' })
  }

  const setBuzzerServerUrl = (serverUrl) => {
    setState({
      buzzerSystem: normalizeBuzzerSystem({
        ...state.buzzerSystem,
        serverUrl,
      }),
    }, { origin: 'admin' })
  }

  const setBuzzerSimulationClients = (enabled) => {
    setState({
      buzzerSystem: normalizeBuzzerSystem({
        ...state.buzzerSystem,
        simulationClients: Boolean(enabled),
      }),
    }, { origin: 'admin' })
  }

  const setBuzzerShowQrOnProjector = (show) => {
    setState({
      buzzerSystem: normalizeBuzzerSystem({
        ...state.buzzerSystem,
        showQrOnProjector: Boolean(show),
      }),
    }, { origin: 'admin' })
  }

  const applyServerBuzzerWinner = (winner) => {
    if (!winner?.teamId) return
    if (tournamentPlayBlockedReason(state)) return
    setState((prev) => {
      if (prev.buzzer?.status === 'locked' && prev.buzzer?.teamId) return {}
      const epoch = bumpTimerEpoch(prev)
      return {
        buzzer: normalizeBuzzer({
          status: 'locked',
          announcement: `${winner.teamName ?? 'Team'} buzzed in first!`,
          teamId: winner.teamId,
          teamName: winner.teamName,
          questionId: winner.questionId ?? null,
          source: 'server',
        }),
        playSession: normalizePlaySession({
          ...prev.playSession,
          assignedTeamId: winner.teamId,
          manualTeamPick: false,
          timerEpoch: epoch,
        }),
        playTimer: createBuzzerAnswerTimer(epoch, true),
      }
    }, { origin: 'buzzer' })
  }

  const armBuzzerForQuestion = (questionId) => {
    if (tournamentPlayBlockedReason(state)) return
    setState({
      buzzer: normalizeBuzzer({
        status: 'ready',
        announcement: null,
        teamId: null,
        teamName: null,
        questionId,
        source: 'server',
      }),
    }, { origin: 'admin' })
  }

  const patchTournament = (patch) => {
    setState((prev) => {
      const instanceId = prev.activeTournamentInstanceId ?? prev.tournament?.id
      const def = getTournamentInstanceDef(instanceId)
      const name =
        typeof patch.name === 'string' && patch.name.trim()
          ? patch.name.trim()
          : def?.name ?? prev.tournament?.name
      return {
        tournament: normalizeTournament({
          ...prev.tournament,
          ...patch,
          id: instanceId,
          name: def?.name ?? name,
        }),
        stage: def?.name ?? name,
      }
    }, { origin: 'admin' })
  }

  const addRoundToTournamentPlan = (roundId) => {
    const round = getState().roundLibrary.find((r) => r.id === roundId)
    if (!round) return { success: false, error: 'Round not found.' }
    if (!round.active) return { success: false, error: 'Round is inactive.' }
    const planned = createPlannedRound(round)
    if (!planned) return { success: false, error: 'Could not plan round.' }
    setState((prev) => ({
      tournament: normalizeTournament({
        ...prev.tournament,
        plannedRounds: [...(prev.tournament?.plannedRounds ?? []), planned],
        status: 'draft',
      }),
    }), { origin: 'admin' })
    return { success: true, planned }
  }

  const removeRoundFromTournamentPlan = (planId) => {
    setState((prev) => ({
      tournament: normalizeTournament({
        ...prev.tournament,
        plannedRounds: (prev.tournament?.plannedRounds ?? []).filter((p) => p.id !== planId),
      }),
    }), { origin: 'admin' })
    return { success: true }
  }

  const moveTournamentRound = (planId, direction) => {
    setState((prev) => {
      const list = [...(prev.tournament?.plannedRounds ?? [])]
      const idx = list.findIndex((p) => p.id === planId)
      if (idx < 0) return {}
      const swap = direction === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= list.length) return {}
      const tmp = list[idx]
      list[idx] = list[swap]
      list[swap] = tmp
      return {
        tournament: normalizeTournament({ ...prev.tournament, plannedRounds: list }),
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const validateAndPrepareTournament = (options = {}) => {
    const instanceId = state.activeTournamentInstanceId
    const def = getTournamentInstanceDef(instanceId)
    if (!def) return { success: false, errors: ['Unknown tournament instance.'] }
    if (!isInstanceActiveForEvent(instanceId, state.tournamentEventSettings)) {
      return {
        success: false,
        errors: [
          'This Quarter Final slot is inactive for the current event. Increase the active Quarter Final count on the dashboard, or configure an active tournament.',
        ],
      }
    }

    const profileId = def.stageProfileId
    const profile = state.stageProfiles?.[profileId]
    const profileCheck = validateStageProfile(profile, state.roundLibrary)
    if (!profileCheck.valid) {
      return { success: false, errors: profileCheck.errors }
    }

    const tournament = normalizeTournament({
      ...state.tournament,
      id: instanceId,
      name: def.name,
    })
    const teamCheck = validateTournamentConfig(tournament, state.teams)
    if (!teamCheck.valid) return { success: false, errors: teamCheck.errors }

    const instances = state.tournamentInstances ?? {}
    const alloc = allocateQuestionsForInstance(
      profile,
      state.roundLibrary,
      instances,
      instanceId,
      {
        allowReuse: Boolean(options.allowQuestionReuse),
        shuffle: Boolean(tournament.playSettings?.questionOrderShuffle),
      },
      state.tournamentEventSettings,
      state.questionLibrary ?? [],
    )
    if (!alloc.success) {
      return {
        success: false,
        errors: alloc.errors,
        shortages: alloc.shortages,
        needsReuseChoice: Boolean(alloc.shortages?.length),
      }
    }

    const sessionActive = [
      TOURNAMENT_STATUS.IN_PROGRESS,
      TOURNAMENT_STATUS.PAUSED,
      TOURNAMENT_STATUS.STOPPED,
      TOURNAMENT_STATUS.COMPLETED,
    ].includes(tournament.status)

    let plannedRounds = tournament.plannedRounds ?? []
    if (!sessionActive || !plannedRounds.length) {
      plannedRounds = buildPlannedRoundsFromStageProfile(
        profile,
        state.roundLibrary,
        alloc.allocations,
      )
    }

    const ready = normalizeTournament({
      ...tournament,
      plannedRounds,
      playSettings: profile.playSettings ?? tournament.playSettings,
      status: TOURNAMENT_STATUS.READY,
      configuredAt: Date.now(),
    })

    setState((prev) => {
      const instances = { ...(prev.tournamentInstances ?? {}) }
      instances[instanceId] = normalizeTournamentInstanceBundle({
        ...(instances[instanceId] ?? createEmptyTournamentInstanceBundle(instanceId)),
        instanceId,
        tournament: ready,
        teams: prev.teams,
      })
      return {
        tournament: ready,
        stage: ready.name,
        tournamentInstances: instances,
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const patchTournamentPlaySettings = (patch) => {
    setState((prev) => ({
      tournament: normalizeTournament({
        ...prev.tournament,
        playSettings: normalizePlaySettings({
          ...prev.tournament?.playSettings,
          ...patch,
        }),
      }),
    }), { origin: 'admin' })
  }

  const applyRoundSnapshotToDisplay = (prev, snapshot, roundNumber) => {
    if (!snapshot) return {}
    const patch = displayPatchFromRound(prev, snapshot)
    return {
      ...patch,
      round: typeof roundNumber === 'number' ? roundNumber : prev.round,
      eventStatus: 'live',
    }
  }

  const bumpTimerEpoch = (prev) => (prev.playSession?.timerEpoch ?? 0) + 1

  const buildMediaPlaybackForQuestion = (prev, mediaId, question) => {
    if (!mediaId) {
      return {
        ...DEFAULT_MEDIA_PLAYBACK,
        volume: prev.mediaPlayback?.volume ?? DEFAULT_MEDIA_PLAYBACK.volume,
        syncSeq: Date.now(),
      }
    }
    const item = prev.mediaLibrary?.find((m) => m.id === mediaId)
    const segmentStart =
      typeof question?.segmentStartSeconds === 'number' && question.segmentStartSeconds >= 0
        ? question.segmentStartSeconds
        : null
    const segmentEnd =
      typeof question?.segmentEndSeconds === 'number' && question.segmentEndSeconds >= 0
        ? question.segmentEndSeconds
        : null
    const startTime = segmentStart ?? 0
    const isVideo = item?.mediaType === 'video'
    const isImage = item?.mediaType === 'image'
    const prevPb = normalizeMediaPlayback(prev.mediaPlayback)
    return {
      ...prevPb,
      mediaId,
      status: isVideo ? 'playing' : 'stopped',
      currentTime: startTime,
      duration: 0,
      error: null,
      videoMuted: isVideo ? Boolean(question?.videoStartMuted) : prevPb.videoMuted,
      videoAutoplaySoundBlocked: false,
      segmentStart,
      segmentEnd,
      playbackMode: isVideo ? 'video' : isImage ? 'image' : 'audio',
      showVideoOnProjector: Boolean(isVideo || isImage),
      showVideoControls: false,
      hideTitleOnProjector: true,
      syncSeq: Date.now(),
    }
  }

  const loadQuestionIntoState = (prev, questionIndex, options = {}) => {
    const questions = [...(prev.playSession?.questions ?? [])]
    const q = questions[questionIndex]
    if (!q) return null
    const snapshot = prev.tournament?.plannedRounds?.find(
      (p) => p.id === prev.playSession?.activePlanRoundId,
    )?.snapshot
    const buzzerRound = Boolean(snapshot?.rules?.buzzerEnabled)
    const playSettings = normalizePlaySettings(prev.tournament?.playSettings)

    let assignedTeamId = prev.playSession?.assignedTeamId
    let teamRotation = prev.playSession?.teamRotation
    let manualTeamPick = prev.playSession?.manualTeamPick

    if (buzzerRound) {
      assignedTeamId = null
      manualTeamPick = false
    } else if (!options.keepTeam) {
      const next = getNextTeamFromRotation(prev.teams, playSettings, teamRotation)
      assignedTeamId = next.teamId
      teamRotation = next.teamRotation
      manualTeamPick = false
    }

    questions.forEach((item, i) => {
      questions[i] = {
        ...item,
        status:
          i === questionIndex
            ? QUESTION_STATUS.CURRENT
            : item.status === QUESTION_STATUS.CURRENT
              ? QUESTION_STATUS.PENDING
              : item.status,
      }
    })

    const epoch = bumpTimerEpoch(prev)
    const mediaId = options.mediaId ?? q.mediaId ?? null

    const patch = {
      playSession: normalizePlaySession({
        ...prev.playSession,
        anchorStep: ANCHOR_STEPS.QUESTION_LIVE,
        playPhase: 'live',
        questionIndex,
        selectedMediaId: mediaId,
        questions,
        assignedTeamId,
        teamRotation,
        manualTeamPick,
        scoreAppliedForQuestionId: null,
        timerEpoch: epoch,
      }),
      playTimer: createFreshPlayTimer(epoch),
      question: {
        ...prev.question,
        prompt: q.prompt,
        letter: q.letter,
        hiddenAnswer: q.hiddenAnswer,
        answerRevealed: false,
      },
      buzzer: buzzerRound
        ? normalizeBuzzer({ status: 'ready', source: 'server' })
        : normalizeBuzzer({ status: 'idle', source: 'manual' }),
    }
    if (!options.preserveScoreDisplay) {
      patch.scoreDisplay = normalizeScoreDisplay({
        projectorOn: false,
        mode: SCORE_DISPLAY_MODE.OFF,
      })
    }
    patch.mediaPlayback = buildMediaPlaybackForQuestion(prev, mediaId, q)
    patch.scorePresentation = normalizeScorePresentation(null)
    return patch
  }

  const syncLiveQuestionMediaAndBuzzer = (questionIndex) => {
    const after = getState()
    const q = after.playSession?.questions?.[questionIndex]
    const mediaId = q?.mediaId
    if (!mediaId) {
      patchMediaPlayback(
        {
          ...DEFAULT_MEDIA_PLAYBACK,
          volume: after.mediaPlayback?.volume ?? DEFAULT_MEDIA_PLAYBACK.volume,
          syncSeq: Date.now(),
        },
        { command: true },
      )
    } else {
      selectMediaForPlayback(mediaId, {
        segmentStart: q.segmentStartSeconds ?? null,
        segmentEnd: q.segmentEndSeconds ?? null,
        videoMuted: Boolean(q?.videoStartMuted),
      })
    }
    const snap = getActiveRoundSnapshot(after.tournament, after.playSession)
    if (snap?.rules?.buzzerEnabled) {
      armBuzzerForQuestion(questionIndex + 1)
    }
  }

  const armGrandOpeningReady = (prev, tournamentId) => {
    if (isIntroPlaying(prev.presentation)) return {}
    if (prev.presentation?.grandOpeningPlayedForTournamentId === tournamentId) {
      return {}
    }
    const intro = prev.presentation?.intro
    if (
      intro?.kind === INTRO_KIND.GRAND &&
      (intro.status === INTRO_STATUS.READY || intro.status === INTRO_STATUS.PLAYING)
    ) {
      return {}
    }
    return {
      presentation: normalizePresentation({
        ...prev.presentation,
        pendingRoundIntroPlanId: null,
        intro: normalizeIntroPlayback({
          kind: INTRO_KIND.GRAND,
          status: INTRO_STATUS.PLAYING,
          token: createIntroToken(INTRO_KIND.GRAND, tournamentId),
          tournamentId,
          stageLine: 'DHRUV SHAH PRESENTS',
          roundLine: '',
        }),
      }),
    }
  }

  const startGrandOpeningIntroPlayback = () => {
    const tid = state.tournament?.id
    if (!tid) return { success: false, error: 'No active tournament.' }
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    setState((prev) => {
      if (isIntroPlaying(prev.presentation)) return {}
      return {
        presentation: normalizePresentation({
          ...prev.presentation,
          intro: normalizeIntroPlayback({
            kind: INTRO_KIND.GRAND,
            status: INTRO_STATUS.PLAYING,
            token: createIntroToken(INTRO_KIND.GRAND, tid),
            tournamentId: tid,
            stageLine: 'DHRUV SHAH PRESENTS',
            roundLine: '',
          }),
        }),
      }
    }, { origin: 'presentation' })
    return { success: true }
  }

  const stopGrandOpeningIntroPlayback = () => {
    getIntroAudioEngine().stopAll()
    setState((prev) => {
      const was = prev.presentation?.intro
      if (was?.kind !== INTRO_KIND.GRAND || was.status !== INTRO_STATUS.PLAYING) return {}
      return {
        presentation: normalizePresentation({
          ...prev.presentation,
          intro: normalizeIntroPlayback({
            kind: INTRO_KIND.GRAND,
            status: INTRO_STATUS.READY,
            token: createIntroToken(INTRO_KIND.GRAND, was.tournamentId ?? 'tournament'),
            tournamentId: was.tournamentId,
            stageLine: was.stageLine || 'DHRUV SHAH PRESENTS',
            roundLine: '',
          }),
        }),
      }
    }, { origin: 'presentation' })
    return { success: true }
  }

  const restartGrandOpeningIntroPlayback = () => startGrandOpeningIntroPlayback()

  const clearGrandIntroOverlay = (presentation) => {
    const intro = presentation?.intro
    if (intro?.kind !== INTRO_KIND.GRAND) return presentation
    return normalizePresentation({
      ...presentation,
      intro: normalizeIntroPlayback({
        kind: INTRO_KIND.NONE,
        status: INTRO_STATUS.DONE,
        token: null,
      }),
    })
  }

  const startRoundIntroForPlan = (prev, tournament, planIndex, planned) => {
    if (!prev.presentation?.autoRoundIntro) return {}
    if (isIntroPlaying(prev.presentation)) {
      return {
        presentation: normalizePresentation({
          ...prev.presentation,
          pendingRoundIntroPlanId: planned.id,
        }),
      }
    }
    const lines = buildRoundIntroLines(tournament, planIndex, planned)
    return {
      presentation: normalizePresentation({
        ...prev.presentation,
        pendingRoundIntroPlanId: null,
        intro: normalizeIntroPlayback({
          kind: INTRO_KIND.ROUND,
          status: INTRO_STATUS.PLAYING,
          token: createIntroToken(INTRO_KIND.ROUND, planned.id),
          planRoundId: planned.id,
          tournamentId: tournament.id,
          stageLine: lines.stageLine,
          roundLine: lines.roundLine,
        }),
      }),
    }
  }

  const resolvePendingRoundIntro = (prev) => {
    const planId = prev.presentation?.pendingRoundIntroPlanId
    if (!planId) return {}
    const tournament = normalizeTournament(prev.tournament)
    const planIndex = tournament.plannedRounds.findIndex((p) => p.id === planId)
    const planned = tournament.plannedRounds[planIndex]
    if (!planned) {
      return {
        presentation: normalizePresentation({
          ...prev.presentation,
          pendingRoundIntroPlanId: null,
        }),
      }
    }
    return startRoundIntroForPlan(
      { ...prev, presentation: { ...prev.presentation, pendingRoundIntroPlanId: null } },
      tournament,
      planIndex,
      planned,
    )
  }

  const finishIntroPlayback = () => {
    setState((prev) => {
      const was = prev.presentation?.intro
      if (!was || was.status !== INTRO_STATUS.PLAYING) return {}

      if (was.kind === INTRO_KIND.GRAND && was.tournamentId) {
        const presentation = normalizePresentation({
          ...prev.presentation,
          grandOpeningPlayedForTournamentId: was.tournamentId,
          intro: normalizeIntroPlayback({
            kind: INTRO_KIND.GRAND,
            status: INTRO_STATUS.DONE,
            token: was.token,
            tournamentId: was.tournamentId,
            stageLine: was.stageLine,
            roundLine: was.roundLine,
            holdElapsedMs: GRAND_INTRO_MS - 400,
          }),
        })
        return { presentation }
      }

      let presentation = normalizePresentation({
        ...prev.presentation,
        intro: normalizeIntroPlayback({
          kind: INTRO_KIND.NONE,
          status: INTRO_STATUS.DONE,
          token: null,
        }),
      })

      const pendingPatch = resolvePendingRoundIntro({ ...prev, presentation })
      if (pendingPatch.presentation) {
        presentation = normalizePresentation({
          ...presentation,
          ...pendingPatch.presentation,
        })
      }
      const merged = { ...prev, presentation }
      const gameplay =
        was.kind === INTRO_KIND.ROUND
          ? buildPostRoundIntroGameplayPatch(merged)
          : {}
      return { presentation, ...gameplay }
    }, { origin: 'presentation' })
    const after = getState()
    if (after.playSession?.anchorStep === ANCHOR_STEPS.QUESTION_LIVE) {
      syncLiveQuestionMediaAndBuzzer(after.playSession.questionIndex ?? 0)
    }
    return { success: true }
  }

  const skipIntroPlayback = () => {
    setState((prev) => {
      if (!isIntroPlaying(prev.presentation)) return {}
      const was = prev.presentation.intro
      if (was.kind === INTRO_KIND.GRAND) {
        getIntroAudioEngine().stopAll()
        const presentation = normalizePresentation({
          ...prev.presentation,
          intro: normalizeIntroPlayback({
            kind: INTRO_KIND.GRAND,
            status: INTRO_STATUS.READY,
            token: createIntroToken(INTRO_KIND.GRAND, was.tournamentId ?? 'tournament'),
            tournamentId: was.tournamentId,
            stageLine: was.stageLine || 'DHRUV SHAH PRESENTS',
            roundLine: '',
          }),
        })
        return { presentation }
      }
      let presentation = normalizePresentation({
        ...prev.presentation,
        intro: normalizeIntroPlayback({
          ...was,
          status: INTRO_STATUS.SKIPPED,
        }),
      })
      presentation = normalizePresentation({
        ...presentation,
        intro: normalizeIntroPlayback({
          kind: INTRO_KIND.NONE,
          status: INTRO_STATUS.DONE,
          token: null,
        }),
      })
      const pendingPatch = resolvePendingRoundIntro({ ...prev, presentation })
      if (pendingPatch.presentation) {
        presentation = normalizePresentation({
          ...presentation,
          ...pendingPatch.presentation,
        })
      }
      const merged = { ...prev, presentation }
      const gameplay =
        was.kind === INTRO_KIND.ROUND
          ? buildPostRoundIntroGameplayPatch(merged)
          : {}
      return { presentation, ...gameplay }
    }, { origin: 'presentation' })
    const after = getState()
    if (after.playSession?.anchorStep === ANCHOR_STEPS.QUESTION_LIVE) {
      syncLiveQuestionMediaAndBuzzer(after.playSession.questionIndex ?? 0)
    }
    return { success: true }
  }

  const patchPresentationSettings = (patch) => {
    setState((prev) => ({
      presentation: normalizePresentation({ ...prev.presentation, ...patch }),
    }), { origin: 'admin' })
  }

  const replayGrandOpeningIntro = () => restartGrandOpeningIntroPlayback()

  const replayRoundIntro = () => {
    const planId = state.playSession?.activePlanRoundId
    const tournament = normalizeTournament(state.tournament)
    const planIndex = tournament.plannedRounds.findIndex((p) => p.id === planId)
    const planned = tournament.plannedRounds[planIndex]
    if (!planned) return { success: false, error: 'No active round for replay.' }
    setState((prev) => {
      if (isIntroPlaying(prev.presentation)) return {}
      const lines = buildRoundIntroLines(tournament, planIndex, planned)
      return {
        presentation: normalizePresentation({
          ...prev.presentation,
          intro: normalizeIntroPlayback({
            kind: INTRO_KIND.ROUND,
            status: INTRO_STATUS.PLAYING,
            token: createIntroToken(INTRO_KIND.ROUND, `${planned.id}-replay`),
            planRoundId: planned.id,
            tournamentId: tournament.id,
            stageLine: lines.stageLine,
            roundLine: lines.roundLine,
          }),
        }),
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const disarmBuzzerPatch = () => ({
    buzzer: normalizeBuzzer({
      status: 'idle',
      announcement: null,
      teamId: null,
      teamName: null,
      questionId: null,
      source: 'manual',
    }),
  })

  const pauseTimerPatch = (prev) => {
    const timer = prev.playTimer
    if (!timer) return {}
    return {
      playTimer: normalizePlayTimer({ ...timer, running: false }),
    }
  }

  const patchTournamentStatus = (prev, status) => {
    const tournament = normalizeTournament({ ...prev.tournament, status })
    return {
      tournament,
      tournamentPlans: upsertTournamentPlan(prev.tournamentPlans, tournament),
    }
  }

  const pauseTournament = () => {
    if (!canPauseTournament(state)) {
      return { success: false, error: 'Tournament is not running.' }
    }
    setState((prev) => ({
      ...patchTournamentStatus(prev, TOURNAMENT_STATUS.PAUSED),
      eventStatus: 'paused',
      ...pauseTimerPatch(prev),
      ...disarmBuzzerPatch(),
    }), { origin: 'admin' })
    return { success: true }
  }

  const resumePausedTournament = () => {
    if (!canResumePausedTournament(state)) {
      return { success: false, error: 'Tournament is not paused.' }
    }
    setState((prev) => ({
      ...patchTournamentStatus(prev, TOURNAMENT_STATUS.IN_PROGRESS),
      eventStatus: 'live',
    }), { origin: 'admin' })
    return { success: true }
  }

  const stopTournament = () => {
    if (!canStopTournament(state)) {
      return { success: false, error: 'No active tournament to stop.' }
    }
    setState((prev) => ({
      ...patchTournamentStatus(prev, TOURNAMENT_STATUS.STOPPED),
      eventStatus: 'idle',
      ...pauseTimerPatch(prev),
      ...disarmBuzzerPatch(),
    }), { origin: 'admin' })
    return { success: true }
  }

  const resumeStoppedTournament = () => {
    if (!canResumeStoppedTournament(state)) {
      return { success: false, error: 'Tournament is not stopped.' }
    }
    setState((prev) => ({
      ...patchTournamentStatus(prev, TOURNAMENT_STATUS.IN_PROGRESS),
      eventStatus: 'live',
    }), { origin: 'admin' })
    return { success: true }
  }

  const completeTournament = () => {
    if (!canCompleteTournament(state)) {
      if (state.tournament?.status === TOURNAMENT_STATUS.COMPLETED) {
        return { success: false, error: 'Tournament is already completed.' }
      }
      return {
        success: false,
        error: 'Complete or skip all planned rounds before finishing the tournament.',
      }
    }
    setState((prev) => ({
      ...patchTournamentStatus(prev, TOURNAMENT_STATUS.COMPLETED),
      eventStatus: 'idle',
      ...pauseTimerPatch(prev),
      ...disarmBuzzerPatch(),
      playSession: normalizePlaySession({
        ...prev.playSession,
        anchorStep: ANCHOR_STEPS.ROUND_SELECT,
        playPhase: 'pick',
      }),
    }), { origin: 'admin' })
    return { success: true }
  }

  const selectTournamentInstance = (instanceId) => {
    const def = getTournamentInstanceDef(instanceId)
    if (!def) return { success: false, error: 'Tournament not found.' }

    setState((prev) => {
      const instances = { ...(prev.tournamentInstances ?? {}) }
      const currentId = prev.activeTournamentInstanceId
      if (currentId) {
        instances[currentId] = captureTournamentInstanceFromState(prev)
      }
      const bundle =
        instances[instanceId] ?? createEmptyTournamentInstanceBundle(instanceId)
      instances[instanceId] = bundle
      return {
        activeTournamentInstanceId: instanceId,
        tournamentInstances: instances,
        ...applyTournamentInstanceBundle(bundle, prev),
      }
    }, { origin: 'admin' })

    return { success: true }
  }

  const selectTournamentPlan = (tournamentId) => {
    const instanceId = getTournamentInstanceDef(tournamentId)?.id ?? tournamentId
    if (!isInstanceActiveForEvent(instanceId, getState().tournamentEventSettings)) {
      return {
        success: false,
        error:
          'This Quarter Final is not active for the current event. Open the Tournaments dashboard to change the active count or view inactive slots.',
      }
    }
    if (getState().activeTournamentInstanceId !== instanceId) {
      const sw = selectTournamentInstance(instanceId)
      if (!sw.success) return sw
    }

    const picked = normalizeTournament(getState().tournament)
    if (!picked) return { success: false, error: 'Tournament not found.' }
    const continuing = [
      TOURNAMENT_STATUS.COMPLETED,
      TOURNAMENT_STATUS.IN_PROGRESS,
      TOURNAMENT_STATUS.PAUSED,
      TOURNAMENT_STATUS.STOPPED,
    ].includes(picked.status)

    if (continuing) {
      setState((prev) => ({
        tournament: normalizeTournament(picked),
        stage: picked.name,
        eventStatus:
          picked.status === TOURNAMENT_STATUS.PAUSED
            ? 'paused'
            : picked.status === TOURNAMENT_STATUS.IN_PROGRESS
              ? 'live'
              : 'idle',
        playSession: normalizePlaySession({
          ...(prev.tournament?.id === picked.id
            ? prev.playSession
            : {
                anchorStep: ANCHOR_STEPS.ROUND_SELECT,
                playPhase: 'pick',
              }),
          entryResolved: true,
          anchorStep:
            prev.tournament?.id === picked.id
              ? prev.playSession?.anchorStep ?? ANCHOR_STEPS.ROUND_SELECT
              : ANCHOR_STEPS.ROUND_SELECT,
        }),
      }), { origin: 'admin' })
      return { success: true }
    }

    setState((prev) => ({
      tournament: normalizeTournament({
        ...picked,
        status: TOURNAMENT_STATUS.IN_PROGRESS,
        startedAt: Date.now(),
      }),
      playSession: normalizePlaySession({
        anchorStep: ANCHOR_STEPS.ROUND_SELECT,
        playPhase: 'pick',
        entryResolved: true,
      }),
      stage: picked.name,
      eventStatus: 'live',
      ...armGrandOpeningReady(prev, picked.id),
    }), { origin: 'admin' })
    return { success: true }
  }

  const startTournamentPlay = () => {
    const prep = validateAndPrepareTournament()
    if (!prep.success) return prep
    const id = getState().tournament?.id
    return selectTournamentPlan(id)
  }

  const setAnchorStep = (step) => {
    setState((prev) => ({
      playSession: normalizePlaySession({ ...prev.playSession, anchorStep: step }),
    }), { origin: 'admin' })
  }

  const validatePlannedRoundPlay = (planRoundId, options = {}) => {
    const { confirmDiscardSkipped = false } = options
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    if (state.tournament?.status !== TOURNAMENT_STATUS.IN_PROGRESS) {
      return { success: false, error: 'Resume the tournament before starting a round.' }
    }
    const tournament = normalizeTournament(state.tournament)
    const planIndex = tournament.plannedRounds.findIndex((p) => p.id === planRoundId)
    const planned = tournament.plannedRounds[planIndex]
    if (!planned) return { success: false, error: 'Round not found.' }
    if (planned.roundStatus === ROUND_PLAY_STATUS.COMPLETED) {
      return { success: false, error: 'This round is already completed.' }
    }
    if (planned.roundStatus === ROUND_PLAY_STATUS.SKIPPED) {
      const hasProgress =
        planned.questionProgress && Object.keys(planned.questionProgress).length > 0
      if (hasProgress && !confirmDiscardSkipped) {
        return { success: false, error: 'CONFIRM_SKIPPED_REPLAY', needsConfirm: true }
      }
    }
    return { success: true, tournament, planIndex, planned, snapshot: planned.snapshot }
  }

  const preparePlannedRound = (planRoundId, options = {}) => {
    const check = validatePlannedRoundPlay(planRoundId, options)
    if (!check.success) return check
    const { snapshot, planIndex } = check
    setState((prev) => ({
      playSession: normalizePlaySession({
        ...prev.playSession,
        pendingPlanRoundId: planRoundId,
        anchorStep: ANCHOR_STEPS.ROUND_START,
        playPhase: 'pick',
        activePlanRoundId: null,
        questions: [],
        questionOrder: [],
        roundCompleteNotice: null,
      }),
      ...applyRoundSnapshotToDisplay(prev, snapshot, planIndex + 1),
    }), { origin: 'admin' })
    return { success: true }
  }

  const startPreparedRound = (options = {}) => {
    const planRoundId = state.playSession?.pendingPlanRoundId
    if (!planRoundId) {
      return { success: false, error: 'Select a round and press Start Round.' }
    }
    return beginPlannedRound(planRoundId, options)
  }

  /** Play round: intro on projector, then simple scoring or question pick (no extra Start step). */
  const playPlannedRound = (planRoundId, options = {}) => beginPlannedRound(planRoundId, options)

  const beginPlannedRound = (planRoundId, options = {}) => {
    const { confirmDiscardSkipped = false } = options
    const check = validatePlannedRoundPlay(planRoundId, options)
    if (!check.success) return check
    const { tournament, planIndex, planned, snapshot } = check
    const playCheck = validateRoundHasPlayableQuestions(snapshot, state.questionLibrary ?? [])
    if (!playCheck.valid) {
      return { success: false, error: playCheck.error }
    }
    const savedProgress = planned.questionProgress
    const restored =
      Array.isArray(savedProgress?.questions) && savedProgress.questions.length > 0
    const { questions, questionOrder } = restored
      ? {
          questions: savedProgress.questions,
          questionOrder: savedProgress.questionOrder ?? savedProgress.questions.map((_, i) => i),
        }
      : buildQuestionQueue(snapshot, Boolean(tournament.playSettings?.questionOrderShuffle), {
          allocatedQuestionIds: planned.allocatedQuestionIds,
          questionLibrary: state.questionLibrary ?? [],
        })

    const plannedRounds = tournament.plannedRounds.map((p) => {
      if (p.id !== planRoundId) {
        return p.roundStatus === ROUND_PLAY_STATUS.ACTIVE
          ? { ...p, roundStatus: ROUND_PLAY_STATUS.PENDING }
          : p
      }
      const isSimple = resolveRoundPlayType(snapshot) === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI
      const restartSimple =
        isSimple &&
        (p.roundStatus === ROUND_PLAY_STATUS.PENDING ||
          (p.roundStatus === ROUND_PLAY_STATUS.SKIPPED && confirmDiscardSkipped))
      return {
        ...p,
        roundStatus: ROUND_PLAY_STATUS.ACTIVE,
        questionProgress:
          p.roundStatus === ROUND_PLAY_STATUS.SKIPPED && confirmDiscardSkipped
            ? {}
            : p.questionProgress,
        teamRoundScores: restartSimple ? {} : p.teamRoundScores,
        simpleScoresFinalized: restartSimple ? false : p.simpleScoresFinalized,
      }
    })

    const nextTournament = normalizeTournament({
      ...tournament,
      plannedRounds,
      currentRoundIndex: planIndex,
      status: 'in_progress',
    })
    setState((prev) => {
      const base = {
        ...clearScorePresentationState(prev),
        tournament: nextTournament,
        tournamentPlans: upsertTournamentPlan(prev.tournamentPlans, nextTournament),
        playSession: normalizePlaySession({
          anchorStep: ANCHOR_STEPS.QUESTION_PICK,
          playPhase: 'pick',
          activePlanRoundId: planRoundId,
          pendingPlanRoundId: null,
          questions,
          questionOrder,
          questionIndex: 0,
          assignedTeamId: null,
          manualTeamPick: false,
          teamRotation: { cycleOrder: [], cycleIndex: 0, cycleNumber: 1 },
          scoreAppliedForQuestionId: null,
          timerEpoch: bumpTimerEpoch(prev),
          roundCompleteNotice: null,
        }),
        playTimer: createFreshPlayTimer(bumpTimerEpoch(prev)),
        ...applyRoundSnapshotToDisplay(prev, snapshot, planIndex + 1),
        question: {
          prompt: '',
          letter: '',
          hiddenAnswer: '',
          answerRevealed: false,
        },
      }
      const presentationForRound = clearGrandIntroOverlay(prev.presentation)
      const clearedGrand =
        presentationForRound !== prev.presentation
          ? { presentation: presentationForRound }
          : {}
      const introPatch = startRoundIntroForPlan(
        { ...prev, ...base, presentation: presentationForRound },
        nextTournament,
        planIndex,
        planned,
      )
      let merged = { ...base, ...clearedGrand, ...introPatch }
      const probe = { ...prev, ...merged }
      if (!isIntroPlaying(probe.presentation)) {
        const gameplay = buildPostRoundIntroGameplayPatch(probe)
        merged = { ...merged, ...gameplay }
      }
      return merged
    }, { origin: 'admin' })
    const afterBegin = getState()
    if (afterBegin.playSession?.anchorStep === ANCHOR_STEPS.QUESTION_LIVE) {
      syncLiveQuestionMediaAndBuzzer(afterBegin.playSession.questionIndex ?? 0)
    }
    return { success: true }
  }

  const skipPlannedRound = (planRoundId) => {
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    if (state.tournament?.status !== TOURNAMENT_STATUS.IN_PROGRESS) {
      return { success: false, error: 'Resume the tournament before changing rounds.' }
    }
    const tournament = normalizeTournament(state.tournament)
    const plannedRounds = tournament.plannedRounds.map((p) =>
      p.id === planRoundId ? { ...p, roundStatus: ROUND_PLAY_STATUS.SKIPPED } : p,
    )
    const next = normalizeTournament({ ...tournament, plannedRounds })
    setState({
      tournament: next,
      tournamentPlans: upsertTournamentPlan(state.tournamentPlans, next),
      playSession: normalizePlaySession({
        ...state.playSession,
        anchorStep: ANCHOR_STEPS.ROUND_SELECT,
        playPhase: 'pick',
        activePlanRoundId: null,
      }),
    }, { origin: 'admin' })
    return { success: true }
  }

  const activatePlayQuestion = (questionIndex) => {
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    const q = state.playSession?.questions?.[questionIndex]
    if (!q || q.status === QUESTION_STATUS.COMPLETED) {
      return { success: false, error: 'Question not available.' }
    }
    setState((prev) => {
      const patch = loadQuestionIntoState(prev, questionIndex)
      if (!patch) return {}
      return patch
    }, { origin: 'admin' })
    syncLiveQuestionMediaAndBuzzer(questionIndex)
    return { success: true }
  }

  const selectPlayQuestion = (questionIndex, _mediaId = null) => {
    return activatePlayQuestion(questionIndex)
  }

  const setManualAssignedTeam = (teamId) => {
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    const snap = getActiveRoundSnapshot(state.tournament, state.playSession)
    const buzzerRound = resolveRoundPlayType(snap) === ROUND_PLAY_TYPE.BUZZER_QUESTION
    setState((prev) => {
      if (buzzerRound && prev.buzzer?.status === 'locked' && prev.buzzer?.source === 'server') {
        return {}
      }
      const epoch = bumpTimerEpoch(prev)
      const manualFallback = buzzerRound && !prev.buzzerSystem?.enabled
      const priorPublicAnnouncement =
        prev.buzzer?.source === 'server' || prev.buzzer?.source === 'demo'
          ? prev.buzzer?.announcement
          : null
      return {
        buzzer: buzzerRound
          ? normalizeBuzzer({
              status: 'locked',
              announcement: priorPublicAnnouncement,
              teamId,
              teamName: prev.teams?.find((t) => t.id === teamId)?.name ?? null,
              questionId: prev.buzzer?.questionId ?? null,
              source: 'manual',
            })
          : prev.buzzer,
        playSession: normalizePlaySession({
          ...prev.playSession,
          assignedTeamId: teamId,
          manualTeamPick: true,
          timerEpoch: epoch,
        }),
        playTimer: manualFallback ? createBuzzerAnswerTimer(epoch, true) : prev.playTimer,
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const startCurrentRoundSession = () => {
    const active = state.tournament?.plannedRounds?.find(
      (p) => p.roundStatus === ROUND_PLAY_STATUS.ACTIVE,
    )
    const pending = state.tournament?.plannedRounds?.find(
      (p) => p.roundStatus === ROUND_PLAY_STATUS.PENDING,
    )
    const target = active ?? pending
    if (!target) return { success: false, error: 'No round to start.' }
    return beginPlannedRound(target.id)
  }

  const adjustTeamScoreGuarded = (teamId, delta) => {
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    const qid = state.playSession?.questions?.[state.playSession?.questionIndex]?.id
    const snapForFp = getActiveRoundSnapshot(state.tournament, state.playSession)
    const simpleFp =
      resolveRoundPlayType(snapForFp) === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI
    const fingerprint = simpleFp ? `simple:${teamId}:${delta}` : `${qid}:${teamId}:${delta}`
    const now = Date.now()
    if (
      state.playSession?.lastScoreFingerprint === fingerprint &&
      now - (state.playSession?.lastScoreAt ?? 0) < 900
    ) {
      return { success: false, error: 'Duplicate score tap — wait a moment.' }
    }
    if (
      qid &&
      state.playSession?.scoreAppliedForQuestionId === qid &&
      state.playSession?.lastScoreFingerprint?.startsWith(`${qid}:`)
    ) {
      return { success: false, error: 'Score already applied for this question.' }
    }
    const planId = state.playSession?.activePlanRoundId
    const snap = getActiveRoundSnapshot(state.tournament, state.playSession)
    const playType = resolveRoundPlayType(snap)
    if (playType === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI && planId) {
      const planned = state.tournament?.plannedRounds?.find((p) => p.id === planId)
      if (planned?.simpleScoresFinalized) {
        return {
          success: false,
          error: 'Scores are locked for this round. Use Edit Score to change a finalized value.',
        }
      }
    }
    setState((prev) => {
      const team = prev.teams?.find((t) => t.id === teamId)
      if (!team) return {}
      const planId = prev.playSession?.activePlanRoundId
      const snap = getActiveRoundSnapshot(prev.tournament, prev.playSession)
      const playType = resolveRoundPlayType(snap)
      if (playType === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI && planId) {
        const planned = prev.tournament?.plannedRounds?.find((p) => p.id === planId)
        if (planned?.simpleScoresFinalized) return {}
      }
      const newTotal = Math.max(0, team.score + delta)
      const announcement = createScoreAnnouncement({
        teamId,
        teamName: team.name,
        delta,
        total: newTotal,
      })
      let tournament = prev.tournament
      if (planId && delta !== 0) {
        tournament = applyTeamRoundScoreDelta(tournament, planId, teamId, delta)
      }
      return {
        tournament,
        tournamentPlans: upsertTournamentPlan(prev.tournamentPlans, tournament),
        teams: prev.teams.map((t) =>
          t.id === teamId ? { ...t, score: newTotal } : t,
        ),
        scoreAnnouncement: announcement,
        playSession: normalizePlaySession({
          ...prev.playSession,
          lastScoreFingerprint: fingerprint,
          lastScoreAt: now,
          scoreAppliedForQuestionId: qid ?? prev.playSession?.scoreAppliedForQuestionId,
        }),
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const setLiveSimpleRoundTeamScore = (teamId, absoluteScore) => {
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    const planId = state.playSession?.activePlanRoundId
    const snap = getActiveRoundSnapshot(state.tournament, state.playSession)
    if (resolveRoundPlayType(snap) !== ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI || !planId) {
      return { success: false, error: 'Not in a Simple Antakshari round.' }
    }
    const planned = state.tournament?.plannedRounds?.find((p) => p.id === planId)
    if (planned?.simpleScoresFinalized) {
      return {
        success: false,
        error: 'Scores are locked. Use Edit Scores on the round list after finishing.',
      }
    }
    const team = state.teams?.find((t) => t.id === teamId)
    if (!team) return { success: false, error: 'Team not found.' }
    const parsed = Number(absoluteScore)
    if (absoluteScore === '' || absoluteScore === null || !Number.isFinite(parsed)) {
      return { success: false, error: 'Enter a valid number.' }
    }
    const next = Math.max(0, Math.round(parsed))
    const oldRound = getTeamRoundScore(planned, teamId)
    if (next === oldRound) return { success: true }

    const fingerprint = `simple-set:${teamId}:${next}`
    const now = Date.now()
    if (
      state.playSession?.lastScoreFingerprint === fingerprint &&
      now - (state.playSession?.lastScoreAt ?? 0) < 900
    ) {
      return { success: false, error: 'Duplicate score update — wait a moment.' }
    }

    setState((prev) => {
      const activePlan = prev.playSession?.activePlanRoundId
      if (!activePlan || activePlan !== planId) return {}
      const { tournament: nextTournament, delta } = setTeamRoundScore(
        prev.tournament,
        planId,
        teamId,
        next,
      )
      const priorTeam = prev.teams?.find((t) => t.id === teamId)
      if (!priorTeam) return {}
      const newTotal = Math.max(0, priorTeam.score + delta)
      const announcement = createScoreAnnouncement({
        teamId,
        teamName: priorTeam.name,
        delta,
        total: newTotal,
      })
      return {
        tournament: nextTournament,
        tournamentPlans: upsertTournamentPlan(prev.tournamentPlans, nextTournament),
        teams: prev.teams.map((t) =>
          t.id === teamId ? { ...t, score: newTotal } : t,
        ),
        scoreAnnouncement: announcement,
        playSession: normalizePlaySession({
          ...prev.playSession,
          lastScoreFingerprint: fingerprint,
          lastScoreAt: now,
        }),
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const tickPlayTimer = (expectedEpoch) => {
    setState((prev) => {
      if (tournamentPlayBlockedReason(prev)) return {}
      const timer = prev.playTimer
      if (!timer?.running || timer.locked) return {}
      if (typeof expectedEpoch === 'number' && timer.epoch !== expectedEpoch) return {}
      const remaining = Math.max(0, (timer.remainingSeconds ?? 0) - 1)
      const locked = remaining <= 0
      return {
        playTimer: normalizePlayTimer({
          ...timer,
          remainingSeconds: remaining,
          running: !locked && timer.running,
          locked,
        }),
      }
    }, { origin: 'timer' })
  }

  const setPlayTimerRunning = (running) => {
    setState((prev) => {
      if (tournamentPlayBlockedReason(prev)) return {}
      const timer = prev.playTimer
      if (timer?.locked) return {}
      const on = Boolean(running)
      return {
        playTimer: normalizePlayTimer({
          ...timer,
          running: on,
          projectorVisible: on || timer?.projectorVisible,
        }),
      }
    }, { origin: 'admin' })
  }

  const patchScoreDisplay = (patch) => {
    setState((prev) => ({
      scoreDisplay: normalizeScoreDisplay({ ...prev.scoreDisplay, ...patch }),
    }), { origin: 'admin' })
  }

  const setScoreDisplayMode = (mode) => {
    const allowed = Object.values(SCORE_DISPLAY_MODE)
    if (!allowed.includes(mode)) return { success: false, error: 'Invalid mode.' }
    setState({
      scoreDisplay: normalizeScoreDisplay({
        projectorOn: true,
        mode,
      }),
    }, { origin: 'admin' })
    return { success: true }
  }

  const hideProjectorScores = () => {
    setState({
      scoreDisplay: normalizeScoreDisplay({
        projectorOn: false,
        mode: SCORE_DISPLAY_MODE.OFF,
      }),
    }, { origin: 'admin' })
    return { success: true }
  }

  const clearScoreAnnouncement = (expectedToken) => {
    setState((prev) => {
      const ann = prev.scoreAnnouncement
      if (!ann) return {}
      if (expectedToken && ann.token !== expectedToken) return {}
      return { scoreAnnouncement: null }
    }, { origin: 'admin' })
    return { success: true }
  }

  const toggleScoreAnnouncementVisibility = () => {
    const ann = state.scoreAnnouncement
    if (!isScoreAnnouncementActive(ann)) {
      return { success: false, error: 'No active score announcement to show.' }
    }
    setState((prev) => {
      const current = prev.scoreAnnouncement
      if (!isScoreAnnouncementActive(current)) return {}
      return {
        scoreAnnouncement: normalizeScoreAnnouncement({
          ...current,
          projectorVisible: !current.projectorVisible,
        }),
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const toggleProjectorScoreDisplay = () => {
    setState((prev) => {
      const on = !prev.scoreDisplay?.projectorOn
      return {
        scoreDisplay: normalizeScoreDisplay({
          ...prev.scoreDisplay,
          projectorOn: on,
          mode: on
            ? prev.scoreDisplay?.mode === SCORE_DISPLAY_MODE.OFF
              ? SCORE_DISPLAY_MODE.CONTEXT
              : prev.scoreDisplay.mode
            : SCORE_DISPLAY_MODE.OFF,
        }),
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const resetTournamentGameplay = () => {
    const tid = state.tournament?.id
    if (!tid) return { success: false, error: 'No tournament selected.' }
    if (state.demoActive) {
      return { success: false, error: 'Stop demo mode before resetting the tournament.' }
    }

    clearSimulationTimer()
    const epoch = (state.playSession?.timerEpoch ?? 0) + 1000

    const tournament = normalizeTournament(state.tournament)
    const resetPlanned = tournament.plannedRounds.map((p) => ({
      ...p,
      roundStatus: ROUND_PLAY_STATUS.PENDING,
      questionProgress: {},
      teamRoundScores: {},
      simpleScoresFinalized: false,
    }))
    const resetTournament = normalizeTournament({
      ...tournament,
      plannedRounds: resetPlanned,
      currentRoundIndex: 0,
      status: TOURNAMENT_STATUS.IN_PROGRESS,
    })

    const plans = normalizeTournamentPlans(state.tournamentPlans).map((p) =>
      p.id === tid ? resetTournament : p,
    )

    setState((prev) => ({
      tournament: resetTournament,
      tournamentPlans: plans,
      teams: prev.teams.map((t) => ({ ...t, score: 0 })),
      eventStatus: 'live',
      playSession: normalizePlaySession({
        anchorStep: ANCHOR_STEPS.ROUND_SELECT,
        playPhase: 'pick',
        entryResolved: true,
        activePlanRoundId: null,
        pendingPlanRoundId: null,
        questions: [],
        questionOrder: [],
        questionIndex: 0,
        assignedTeamId: null,
        manualTeamPick: false,
        teamRotation: { cycleOrder: [], cycleIndex: 0, cycleNumber: 1 },
        scoreAppliedForQuestionId: null,
        lastScoreFingerprint: null,
        lastScoreAt: 0,
        timerEpoch: epoch,
        roundCompleteNotice: null,
      }),
      playTimer: createFreshPlayTimer(epoch),
      scoreDisplay: normalizeScoreDisplay({
        projectorOn: false,
        mode: SCORE_DISPLAY_MODE.OFF,
      }),
      scoreAnnouncement: null,
      buzzer: normalizeBuzzer({ status: 'idle', source: 'manual' }),
      buzzerSystem: normalizeBuzzerSystem({
        ...prev.buzzerSystem,
        showQrOnProjector: false,
      }),
      scorePresentation: normalizeScorePresentation(null),
      mediaPlayback: {
        ...DEFAULT_MEDIA_PLAYBACK,
        volume: prev.mediaPlayback?.volume ?? DEFAULT_MEDIA_PLAYBACK.volume,
      },
      ...armGrandOpeningReady(prev, tid),
      question: {
        prompt: 'Ready for a new game.',
        letter: '',
        hiddenAnswer: '',
        answerRevealed: false,
      },
    }), { origin: 'admin' })
    return { success: true }
  }

  const clearRoundCompleteNotice = () => {
    setState((prev) => ({
      playSession: normalizePlaySession({
        ...prev.playSession,
        roundCompleteNotice: null,
      }),
    }), { origin: 'admin' })
  }

  const setPlayEntryStep = (step) => {
    setState((prev) => ({
      playSession: normalizePlaySession({
        ...prev.playSession,
        anchorStep: step,
        entryResolved: step !== ANCHOR_STEPS.MODE_SELECT,
      }),
    }), { origin: 'admin' })
    return { success: true }
  }

  const resetPlayTimer = () => {
    setState((prev) => {
      const epoch = prev.playTimer?.epoch ?? prev.playSession?.timerEpoch ?? 0
      return { playTimer: createFreshPlayTimer(epoch) }
    }, { origin: 'admin' })
  }

  const beginScorePresentation = (prev, kind, planRoundId = null) => ({
    scorePresentation: normalizeScorePresentation({
      active: true,
      kind,
      phase:
        kind === SCORE_PRESENTATION_KIND.TOTAL_ASCENDING
          ? SCORE_PRESENTATION_PHASE.SCOREBOARD
          : SCORE_PRESENTATION_PHASE.TEAM,
      teamOrder:
        kind === SCORE_PRESENTATION_KIND.TOTAL_ASCENDING
          ? []
          : teamOrderForRoundReveal(prev.teams, prev.tournament?.playSettings),
      teamIndex: 0,
      planRoundId,
      priorScoreDisplay: prev.scoreDisplay,
    }),
    scoreDisplay: normalizeScoreDisplay({
      projectorOn: true,
      mode: SCORE_DISPLAY_MODE.ALL,
    }),
  })

  const endActiveRoundToPresentation = (prev, { completed }) => {
    const planId = prev.playSession?.activePlanRoundId
    if (!planId) return {}
    const existingPlan = prev.tournament?.plannedRounds?.find((p) => p.id === planId)
    if (completed && existingPlan?.roundStatus === ROUND_PLAY_STATUS.COMPLETED) {
      return {}
    }
    const plannedRounds = (prev.tournament?.plannedRounds ?? []).map((p) => {
      if (p.id !== planId) return p
      if (completed) {
        const isSimple =
          resolveRoundPlayType(p.snapshot) === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI
        return {
          ...p,
          roundStatus: ROUND_PLAY_STATUS.COMPLETED,
          stoppedEarly: false,
          simpleScoresFinalized: isSimple ? true : p.simpleScoresFinalized,
        }
      }
      return {
        ...p,
        stoppedEarly: true,
        questionProgress: {
          questions: prev.playSession?.questions ?? [],
          questionOrder: prev.playSession?.questionOrder ?? [],
          questionIndex: prev.playSession?.questionIndex ?? 0,
        },
      }
    })
    const tournament = normalizeTournament({ ...prev.tournament, plannedRounds })
    const completedPlan = plannedRounds.find((p) => p.id === planId)
    const notice = completed
      ? `Round complete — ${completedPlan?.snapshot?.name ?? 'Round'}`
      : `Round paused — ${completedPlan?.snapshot?.name ?? 'Round'}`
    const shared = {
      tournament,
      tournamentPlans: upsertTournamentPlan(prev.tournamentPlans, tournament),
      playSession: normalizePlaySession({
        ...prev.playSession,
        anchorStep: ANCHOR_STEPS.ROUND_SELECT,
        playPhase: 'pick',
        activePlanRoundId: null,
        pendingPlanRoundId: null,
        questions: [],
        questionOrder: [],
        roundCompleteNotice: notice,
        simpleScoredTeamIds: [],
      }),
      buzzer: normalizeBuzzer({ status: 'idle', source: 'manual' }),
      playTimer: createFreshPlayTimer(bumpTimerEpoch(prev)),
      question: { ...prev.question, answerRevealed: false },
      mediaPlayback: {
        ...DEFAULT_MEDIA_PLAYBACK,
        volume: prev.mediaPlayback?.volume ?? DEFAULT_MEDIA_PLAYBACK.volume,
      },
    }
    if (!completed) {
      return {
        ...clearScorePresentationState(prev),
        ...shared,
      }
    }
    return {
      ...beginScorePresentation(
        { ...prev, tournament },
        SCORE_PRESENTATION_KIND.TOTAL_ASCENDING,
        planId,
      ),
      ...shared,
    }
  }

  const clearScorePresentationState = (prev) => {
    const prior = prev.scorePresentation?.priorScoreDisplay
    return {
      scorePresentation: normalizeScorePresentation(null),
      scoreDisplay: prior ? normalizeScoreDisplay(prior) : prev.scoreDisplay,
    }
  }

  const advanceScorePresentation = () => {
    setState((prev) => {
      const sp = prev.scorePresentation
      if (!sp?.active) return {}
      if (sp.phase === SCORE_PRESENTATION_PHASE.TEAM) {
        const next = sp.teamIndex + 1
        if (next < sp.teamOrder.length) {
          return {
            scorePresentation: normalizeScorePresentation({ ...sp, teamIndex: next }),
          }
        }
        return {
          scorePresentation: normalizeScorePresentation({
            ...sp,
            phase: SCORE_PRESENTATION_PHASE.SCOREBOARD,
          }),
        }
      }
      if (sp.phase === SCORE_PRESENTATION_PHASE.SCOREBOARD) {
        return clearScorePresentationState(prev)
      }
      return {}
    }, { origin: 'admin' })
    return { success: true }
  }

  const skipScorePresentation = () => {
    setState((prev) => clearScorePresentationState(prev), { origin: 'admin' })
    return { success: true }
  }

  const startTotalScoresPresentation = () => {
    if (tournamentPlayBlockedReason(state)) {
      return { success: false, error: tournamentPlayBlockedReason(state) }
    }
    setState((prev) => beginScorePresentation(prev, SCORE_PRESENTATION_KIND.TOTAL_ASCENDING), {
      origin: 'admin',
    })
    return { success: true }
  }

  const stopActiveRoundEarly = () => {
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    if (!state.playSession?.activePlanRoundId) {
      return { success: false, error: 'No active round.' }
    }
    setState((prev) => endActiveRoundToPresentation(prev, { completed: false }), { origin: 'admin' })
    return { success: true }
  }

  const finishSimpleRound = (options = {}) => {
    const { force = false } = options
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    const planId = state.playSession?.activePlanRoundId
    const planned = state.tournament?.plannedRounds?.find((p) => p.id === planId)
    if (!planned) return { success: false, error: 'No active Simple Antakshari round.' }
    const anyRoundPoints = (state.teams ?? []).some(
      (t) => getTeamRoundScore(planned, t.id) !== 0,
    )
    if (!force && !anyRoundPoints) {
      return {
        success: false,
        error: 'No round scores recorded yet. Finish anyway?',
        needsConfirm: true,
      }
    }
    setState((prev) => endActiveRoundToPresentation(prev, { completed: true }), { origin: 'admin' })
    return { success: true }
  }

  const editFinalizedSimpleRoundTeamScore = (planRoundId, teamId, newRoundScore) => {
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    const tournament = normalizeTournament(state.tournament)
    const planned = tournament.plannedRounds.find((p) => p.id === planRoundId)
    if (!planned) return { success: false, error: 'Round not found.' }
    if (resolveRoundPlayType(planned.snapshot) !== ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI) {
      return { success: false, error: 'Only Simple Antakshari rounds support this edit.' }
    }
    if (planned.roundStatus !== ROUND_PLAY_STATUS.COMPLETED) {
      return { success: false, error: 'Finish the round before editing locked scores.' }
    }
    const team = state.teams?.find((t) => t.id === teamId)
    if (!team) return { success: false, error: 'Team not found.' }
    const oldRound = getTeamRoundScore(planned, teamId)
    const next = Math.max(0, Math.round(Number(newRoundScore) || 0))
    if (next === oldRound) return { success: true }

    setState((prev) => {
      const { tournament: nextTournament, delta } = setTeamRoundScore(
        prev.tournament,
        planRoundId,
        teamId,
        next,
      )
      const priorTeam = prev.teams?.find((t) => t.id === teamId)
      if (!priorTeam) return {}
      const newTotal = Math.max(0, priorTeam.score + delta)
      return {
        tournament: nextTournament,
        tournamentPlans: upsertTournamentPlan(prev.tournamentPlans, nextTournament),
        teams: prev.teams.map((t) =>
          t.id === teamId ? { ...t, score: newTotal } : t,
        ),
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const finishQuestionRound = () => {
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    const session = state.playSession
    const q = session?.questions?.[session?.questionIndex]
    const roundSnap = getActiveRoundSnapshot(state.tournament, session)
    if (q && questionScoreRequired(roundSnap, q) && session.scoreAppliedForQuestionId !== q.id) {
      return {
        success: false,
        error: 'Record a score for the current question before finishing.',
        needsConfirm: true,
      }
    }
    setState((prev) => endActiveRoundToPresentation(prev, { completed: true }), { origin: 'admin' })
    return { success: true }
  }

  const finalizeAndNextQuestion = (options = {}) => {
    const { force = false } = options
    const blocked = tournamentPlayBlockedReason(state)
    if (blocked) return { success: false, error: blocked }
    const session = state.playSession
    const q = session?.questions?.[session?.questionIndex]
    if (!q) return { success: false, error: 'No active question.' }

    const roundSnap = getActiveRoundSnapshot(state.tournament, session)
    const needsScore =
      questionScoreRequired(roundSnap, q) && session.scoreAppliedForQuestionId !== q.id

    if (!force && needsScore) {
      return {
        success: false,
        error: 'Score update required for this question.',
        needsConfirm: true,
        needsScore: true,
      }
    }

    setState((prev) => {
      const questions = [...(prev.playSession?.questions ?? [])]
      const idx = prev.playSession?.questionIndex ?? 0
      if (questions[idx]) {
        questions[idx] = { ...questions[idx], status: QUESTION_STATUS.COMPLETED }
      }
      const sessionAfter = normalizePlaySession({
        ...prev.playSession,
        questions,
        playPhase: 'pick',
        scoreAppliedForQuestionId: null,
      })
      const nextIdx = findNextQuestionIndex(sessionAfter)
      if (nextIdx < 0) {
        return endActiveRoundToPresentation(
          {
            ...prev,
            playSession: sessionAfter,
          },
          { completed: true },
        )
      }
      const prevWithSession = { ...prev, playSession: sessionAfter }
      const patch = loadQuestionIntoState(prevWithSession, nextIdx, {
        preserveScoreDisplay: true,
      })
      if (!patch) {
        return endActiveRoundToPresentation(prevWithSession, { completed: true })
      }
      return patch
    }, { origin: 'admin' })

    const after = getState()
    if (after.playSession?.anchorStep === ANCHOR_STEPS.ROUND_SELECT) {
      return { success: true, roundComplete: true }
    }
    if (after.playSession?.anchorStep === ANCHOR_STEPS.QUESTION_LIVE) {
      syncLiveQuestionMediaAndBuzzer(after.playSession.questionIndex ?? 0)
    }
    return { success: true, roundComplete: false }
  }

  const goToNextQuestion = () => finalizeAndNextQuestion()

  const startNextTournamentRound = () => {
    setAnchorStep(ANCHOR_STEPS.ROUND_SELECT)
    return { success: true, completed: false }
  }

  const setTeamCountTarget = (count) => {
    const target = Math.min(12, Math.max(2, Math.round(Number(count) || 2)))
    let teams = [...state.teams]
    if (target > teams.length) {
      while (teams.length < target) {
        teams.push({
          id: createTeamId(),
          name: `Team ${teams.length + 1}`,
          score: 0,
          accent: pickAvailableTeamColor(teams),
          tournament: { ...DEFAULT_TOURNAMENT_TEAM_META },
        })
      }
    } else if (target < teams.length) {
      teams = teams.slice(0, target)
    } else {
      return { success: true }
    }
    setState({ teams }, { origin: 'teams' })
    return { success: true }
  }

  const revealAnswer = (revealed) => {
    setState((prev) => ({
      question: { ...prev.question, answerRevealed: revealed },
    }), { origin: 'admin' })
  }

  const buzzerClearPatchIfTeam = (prev, teamId) => {
    if (prev.buzzer?.teamId !== teamId) return {}
    return {
      buzzer: normalizeBuzzer({ status: 'idle', source: 'manual' }),
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
    setState((prev) => {
      const merged = {
        ...normalizeMediaPlayback(prev.mediaPlayback),
        ...patch,
        ...(bumpSeq ? { syncSeq: patch.syncSeq ?? Date.now() } : {}),
      }
      const mediaId = merged.mediaId
      const item = mediaId ? prev.mediaLibrary?.find((m) => m.id === mediaId) : null
      if (item?.mediaType === 'video' && merged.playbackMode !== 'audio') {
        merged.playbackMode = 'video'
        merged.showVideoOnProjector = true
      }
      return { mediaPlayback: merged }
    }, { origin: 'media' })
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

  const selectMediaForPlayback = (mediaId, options = {}) => {
    const item = getState().mediaLibrary.find((m) => m.id === mediaId)
    if (!item) return { success: false, error: 'Media not found.' }
    const segmentStart =
      typeof options.segmentStart === 'number' && options.segmentStart >= 0
        ? options.segmentStart
        : null
    const segmentEnd =
      typeof options.segmentEnd === 'number' && options.segmentEnd >= 0
        ? options.segmentEnd
        : null
    const startTime = segmentStart ?? 0
    const isVideo = item.mediaType === 'video'
    const isImage = item.mediaType === 'image'
    const prevPb = normalizeMediaPlayback(getState().mediaPlayback)
    const videoMuted =
      typeof options.videoMuted === 'boolean'
        ? options.videoMuted
        : prevPb.videoMuted
    patchMediaPlayback(
      {
        mediaId,
        status: isVideo ? 'playing' : 'stopped',
        currentTime: startTime,
        duration: 0,
        error: null,
        videoAutoplaySoundBlocked: false,
        segmentStart,
        segmentEnd,
        videoMuted,
        playbackMode: isVideo ? 'video' : isImage || item.mediaType === 'text' ? 'image' : 'audio',
        showVideoOnProjector: isVideo || isImage,
        showVideoControls: false,
        syncSeq: Date.now(),
      },
      { command: true },
    )
    return { success: true, item }
  }

  const setVideoSoundMuted = (muted) => {
    const m = Boolean(muted)
    const pb = getState().mediaPlayback
    patchMediaPlayback(
      {
        videoMuted: m,
        videoAutoplaySoundBlocked: m ? false : pb?.videoAutoplaySoundBlocked,
        error: null,
        status:
          pb?.status === 'paused' || pb?.status === 'playing' ? 'playing' : pb?.status ?? 'idle',
        syncSeq: Date.now(),
      },
      { command: true },
    )
    return { success: true }
  }

  const confirmQuestionForPlay = () => {
    const mediaId = state.playSession?.selectedMediaId
    if (mediaId) {
      const result = selectMediaForPlayback(mediaId)
      if (!result.success) return result
    }
    setAnchorStep(ANCHOR_STEPS.PLAY_QUESTION)
    return { success: true }
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

  const buildTournamentDataExport = () => buildTournamentExportPackage(getState())

  const importTournamentData = async (pkg, options = {}) => {
    const validation = validateTournamentImportPackage(pkg)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }
    const idbReadyIds = new Set(options.idbReadyIds ?? [])
    for (const entry of validation.data.mediaCatalog) {
      if (entry.source === 'external' && entry.externalUrl) continue
      if (idbReadyIds.has(entry.id)) continue
      try {
        const record = await getMediaBlob(entry.id)
        if (record?.blob?.size > 0) {
          idbReadyIds.add(entry.id)
        }
      } catch {
        // ignore read errors
      }
    }
    const result = applyTournamentImportPackage(getState(), pkg, {
      ...options,
      idbReadyIds,
    })
    if (!result.success) {
      return result
    }
    setState((prev) => ({
      ...prev,
      ...result.patch,
      updatedAt: Date.now(),
    }), { origin: 'migration' })
    return { success: true, tournamentId: result.patch.tournament?.id }
  }

  const validateTournamentDataImport = (pkg) => validateTournamentImportPackage(pkg)

  const upsertRelinkedMediaItems = (items) => {
    const normalized = items.map((item) => normalizeMediaItem(item)).filter(Boolean)
    if (!normalized.length) return { success: true, updated: 0 }
    setState((prev) => {
      const byId = new Map(prev.mediaLibrary.map((m) => [m.id, m]))
      for (const item of normalized) {
        byId.set(item.id, item)
      }
      return { mediaLibrary: normalizeMediaLibrary([...byId.values()]) }
    }, { origin: 'media' })
    return { success: true, updated: normalized.length }
  }

  const auditOfflineMedia = () => auditMediaLibraryOfflineStatus(getState().mediaLibrary)

  const relinkMediaMatches = async (matches) => {
    const linked = []
    const failed = []
    for (const row of matches ?? []) {
      if (row.external) {
        linked.push(row.catalogItem)
        continue
      }
      if (!row.file) continue
      const result = await importMediaFileWithStableId(row.file, row.catalogItem)
      if (result.success && result.item) {
        linked.push(result.item)
      } else {
        failed.push({ id: row.catalogItem?.id, error: result.error })
      }
    }
    if (linked.length) {
      upsertRelinkedMediaItems(linked)
    }
    return { success: failed.length === 0, linked, failed }
  }

  const patchStageProfile = (profileId, patch) => {
    setState((prev) => {
      const current = prev.stageProfiles?.[profileId]
      const next = normalizeStageProfile({ ...current, ...patch, id: profileId })
      return {
        stageProfiles: {
          ...prev.stageProfiles,
          [profileId]: next,
        },
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const addRoundToStageProfile = (profileId, roundId) => {
    const round = getState().roundLibrary.find((r) => r.id === roundId)
    if (!round) return { success: false, error: 'Round not found.' }
    if (!round.active) return { success: false, error: 'Round is inactive.' }
    setState((prev) => {
      const profile = normalizeStageProfile(prev.stageProfiles?.[profileId])
      const slot = normalizeStageProfileSlot({
        libraryRoundId: roundId,
        questionCount: defaultQuestionCountForRound(round),
        sortOrder: profile.slots.length,
      })
      if (!slot) return {}
      return {
        stageProfiles: {
          ...prev.stageProfiles,
          [profileId]: normalizeStageProfile({
            ...profile,
            slots: [...profile.slots, slot],
          }),
        },
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const removeRoundFromStageProfile = (profileId, slotId) => {
    setState((prev) => {
      const profile = normalizeStageProfile(prev.stageProfiles?.[profileId])
      return {
        stageProfiles: {
          ...prev.stageProfiles,
          [profileId]: normalizeStageProfile({
            ...profile,
            slots: profile.slots.filter((s) => s.id !== slotId),
          }),
        },
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const moveStageProfileRound = (profileId, slotId, direction) => {
    setState((prev) => {
      const profile = normalizeStageProfile(prev.stageProfiles?.[profileId])
      const list = [...profile.slots]
      const idx = list.findIndex((s) => s.id === slotId)
      if (idx < 0) return {}
      const swap = direction === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= list.length) return {}
      const tmp = list[idx]
      list[idx] = list[swap]
      list[swap] = tmp
      return {
        stageProfiles: {
          ...prev.stageProfiles,
          [profileId]: normalizeStageProfile({
            ...profile,
            slots: list.map((s, i) => ({ ...s, sortOrder: i })),
          }),
        },
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const patchQuestionBankRoundSelection = (libraryRoundId, patch, targetInstanceId = null) => {
    const instanceId = targetInstanceId ?? state.activeTournamentInstanceId
    if (!instanceId || !libraryRoundId) {
      return { success: false, error: 'Select a tournament first.' }
    }
    setState((prev) => {
      const bundle = prev.tournamentInstances?.[instanceId] ?? createEmptyTournamentInstanceBundle(instanceId)
      const prevSel = bundle.questionBankSelections?.[libraryRoundId] ?? {}
      const bankId = patch.bankId ?? prevSel.bankId
      if (!bankId) return {}
      const nextSel = normalizeQuestionBankRoundSelection(
        { ...prevSel, ...patch, bankId },
        bankId,
      )
      return {
        tournamentInstances: {
          ...prev.tournamentInstances,
          [instanceId]: {
            ...bundle,
            questionBankSelections: {
              ...bundle.questionBankSelections,
              [libraryRoundId]: nextSel,
            },
          },
        },
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const setStageProfileQuestionCount = (profileId, slotId, questionCount) => {
    setState((prev) => {
      const profile = normalizeStageProfile(prev.stageProfiles?.[profileId])
      const slots = profile.slots.map((s) =>
        s.id === slotId
          ? {
              ...s,
              questionCount:
                questionCount === '' || questionCount === null
                  ? null
                  : Math.max(1, Math.floor(Number(questionCount))),
            }
          : s,
      )
      return {
        stageProfiles: {
          ...prev.stageProfiles,
          [profileId]: normalizeStageProfile({ ...profile, slots }),
        },
      }
    }, { origin: 'admin' })
    return { success: true }
  }

  const setActiveQuarterFinalCount = (count, options = {}) => {
    const next = normalizeTournamentEventSettings({
      activeQuarterFinalCount: count,
    })
    const current = normalizeTournamentEventSettings(state.tournamentEventSettings)
    if (next.activeQuarterFinalCount === current.activeQuarterFinalCount) {
      return { success: true }
    }
    if (next.activeQuarterFinalCount < current.activeQuarterFinalCount) {
      const affected = describeDeactivatedQuarterFinalsWithProgress(
        state.tournamentInstances,
        next.activeQuarterFinalCount,
      )
      if (affected.length && !options.confirmed) {
        return {
          success: false,
          needsConfirmation: true,
          affected: affected.map((d) => d.name),
          errors: [
            `Lowering the count will deactivate ${affected.map((d) => d.name).join(', ')}. Those tournaments have saved teams, progress, or results. Data is kept, but they will leave the event workflow.`,
          ],
        }
      }
    }
    setState({ tournamentEventSettings: next }, { origin: 'admin' })
    return { success: true }
  }

  const saveStageProfile = (profileId) => {
    const profile = state.stageProfiles?.[profileId]
    const result = validateStageProfile(profile, state.roundLibrary)
    if (!result.valid) return { success: false, errors: result.errors }
    setState((prev) => {
      const stageProfiles = {
        ...prev.stageProfiles,
        [profileId]: normalizeStageProfile({
          ...prev.stageProfiles?.[profileId],
          id: profileId,
          savedAt: Date.now(),
        }),
      }
      const synced = syncTournamentInstancesFromStageProfiles({
        tournamentInstances: prev.tournamentInstances,
        stageProfiles,
        roundLibrary: prev.roundLibrary,
        tournamentEventSettings: prev.tournamentEventSettings,
        stageProfileId: profileId,
        forceReplan: true,
        questionLibrary: prev.questionLibrary ?? [],
      })
      const patch = { stageProfiles, tournamentInstances: synced.tournamentInstances }
      const activeId = prev.activeTournamentInstanceId
      const activeDef = getTournamentInstanceDef(activeId)
      if (activeDef?.stageProfileId === profileId && synced.tournamentInstances[activeId]) {
        Object.assign(
          patch,
          applyTournamentInstanceBundle(synced.tournamentInstances[activeId], prev),
        )
      }
      return patch
    }, { origin: 'admin' })
    return { success: true }
  }

  const resetTournamentInstance = (instanceId) => {
    const def = getTournamentInstanceDef(instanceId)
    if (!def) return { success: false, error: 'Unknown tournament.' }
    if (getState().activeTournamentInstanceId === instanceId) {
      return resetTournamentGameplay()
    }
    setState((prev) => {
      const instances = { ...(prev.tournamentInstances ?? {}) }
      const bundle = instances[instanceId] ?? createEmptyTournamentInstanceBundle(instanceId)
      const tournament = normalizeTournament(bundle.tournament)
      const resetPlanned = (tournament.plannedRounds ?? []).map((p) => ({
        ...p,
        roundStatus: ROUND_PLAY_STATUS.PENDING,
        questionProgress: {},
        teamRoundScores: {},
        simpleScoresFinalized: false,
      }))
      instances[instanceId] = {
        ...bundle,
        teams: bundle.teams.map((t) => ({ ...t, score: 0 })),
        tournament: normalizeTournament({
          ...tournament,
          plannedRounds: resetPlanned,
          currentRoundIndex: 0,
          status:
            resetPlanned.length && bundle.teams?.length >= 2
              ? TOURNAMENT_STATUS.READY
              : TOURNAMENT_STATUS.DRAFT,
        }),
        playSession: normalizePlaySession({
          anchorStep: ANCHOR_STEPS.TOURNAMENT_SELECT,
          entryResolved: false,
        }),
        eventStatus: 'idle',
      }
      return { tournamentInstances: instances }
    }, { origin: 'admin' })
    return { success: true }
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
    setBuzzerSystemEnabled,
    setBuzzerServerUrl,
    setBuzzerSimulationClients,
    setBuzzerShowQrOnProjector,
    applyServerBuzzerWinner,
    armBuzzerForQuestion,
    revealAnswer,
    toggleAnswerVisibility,
    addTeam,
    updateTeam,
    deleteTeam,
    saveRound,
    upsertQuestionLibraryEntry,
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
    confirmQuestionForPlay,
    addExternalMediaLink,
    toggleMediaPlaybackFlag,
    setVideoSoundMuted,
    patchTournament,
    patchTournamentPlaySettings,
    selectTournamentPlan,
    beginPlannedRound,
    skipPlannedRound,
    activatePlayQuestion,
    setManualAssignedTeam,
    finalizeAndNextQuestion,
    addRoundToTournamentPlan,
    removeRoundFromTournamentPlan,
    moveTournamentRound,
    validateAndPrepareTournament,
    startTournamentPlay,
    setAnchorStep,
    startCurrentRoundSession,
    selectPlayQuestion,
    adjustTeamScoreGuarded,
    setLiveSimpleRoundTeamScore,
    tickPlayTimer,
    setPlayTimerRunning,
    resetPlayTimer,
    goToNextQuestion,
    startNextTournamentRound,
    setTeamCountTarget,
    patchPresentationSettings,
    skipIntroPlayback,
    finishIntroPlayback,
    startGrandOpeningIntroPlayback,
    stopGrandOpeningIntroPlayback,
    restartGrandOpeningIntroPlayback,
    replayGrandOpeningIntro,
    replayRoundIntro,
    pauseTournament,
    resumePausedTournament,
    stopTournament,
    resumeStoppedTournament,
    completeTournament,
    patchScoreDisplay,
    setScoreDisplayMode,
    hideProjectorScores,
    clearScoreAnnouncement,
    toggleScoreAnnouncementVisibility,
    toggleProjectorScoreDisplay,
    setPlayEntryStep,
    preparePlannedRound,
    startPreparedRound,
    playPlannedRound,
    resetTournamentGameplay,
    clearRoundCompleteNotice,
    advanceScorePresentation,
    skipScorePresentation,
    startTotalScoresPresentation,
    stopActiveRoundEarly,
    finishSimpleRound,
    editFinalizedSimpleRoundTeamScore,
    finishQuestionRound,
    buildTournamentDataExport,
    importTournamentData,
    validateTournamentDataImport,
    upsertRelinkedMediaItems,
    auditOfflineMedia,
    relinkMediaMatches,
    selectTournamentInstance,
    patchStageProfile,
    addRoundToStageProfile,
    removeRoundFromStageProfile,
    moveStageProfileRound,
    setStageProfileQuestionCount,
    patchQuestionBankRoundSelection,
    saveStageProfile,
    resetTournamentInstance,
    setActiveQuarterFinalCount,
    destroy: clearSimulationTimer,
  }
}

export const gameStateStore = createStore()

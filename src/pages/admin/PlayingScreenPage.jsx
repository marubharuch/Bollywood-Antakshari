import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from '../../components/admin/AdminShell.jsx'
import { PlayTimerPanel } from '../../components/admin/playing/PlayTimerPanel.jsx'
import { PlayingContextLines } from '../../components/admin/playing/PlayingContextLines.jsx'
import { TournamentSelectGrid } from '../../components/admin/playing/TournamentSelectGrid.jsx'
import { RoundSelectGrid } from '../../components/admin/playing/RoundSelectGrid.jsx'
import { ScoreDisplayControls } from '../../components/admin/playing/ScoreDisplayControls.jsx'
import { ScoreAnnouncementToggle } from '../../components/admin/playing/ScoreAnnouncementToggle.jsx'
import { useScoreAnnouncementExpiry } from '../../hooks/useScoreAnnouncementExpiry.js'
import { TournamentOptionsMenu } from '../../components/admin/playing/TournamentOptionsMenu.jsx'
import { IntroSettingsMenu } from '../../components/admin/playing/IntroSettingsMenu.jsx'
import { GrandIntroControls } from '../../components/admin/playing/GrandIntroControls.jsx'
import { grandIntroControlMode } from '../../features/presentation/introModel.js'
import { QuestionNumberCards } from '../../components/admin/playing/QuestionNumberCards.jsx'
import { AdminTeamScoreboard } from '../../components/admin/AdminTeamScoreboard.jsx'
import { CompactBuzzerCard } from '../../components/buzzer/CompactBuzzerCard.jsx'
import { AnchorMinimalMediaControls } from '../../components/media/AnchorMinimalMediaControls.jsx'
import { Button } from '../../components/common/Button.jsx'
import { InlineAlert } from '../../components/common/InlineAlert.jsx'
import { ToastStack } from '../../components/common/ToastStack.jsx'
import { useAdminShell } from '../../hooks/useAdminShell.js'
import { useGameState } from '../../hooks/useGameState.js'
import { usePlayTimer } from '../../hooks/usePlayTimer.js'
import { gameStateStore } from '../../state/gameStateStore.js'
import {
  ANCHOR_STEPS,
  findNextQuestionIndex,
  getActiveRoundSnapshot,
  QUESTION_STATUS,
} from '../../features/tournament/tournamentModel.js'
import { ROUND_PLAY_TYPE, resolveRoundPlayType } from '../../features/rounds/roundPlayType.js'
import { ScorePresentationControls } from '../../components/admin/playing/ScorePresentationControls.jsx'
import { TOURNAMENT_STATUS } from '../../features/tournament/tournamentLifecycle.js'
import { isIntroPlaying } from '../../features/presentation/introModel.js'
import {
  canPauseTournament,
  canResumePausedTournament,
} from '../../features/tournament/tournamentLifecycle.js'
import { ProjectorScreenSettingsModal } from '../../components/admin/playing/ProjectorScreenSettingsModal.jsx'
import { SimpleRoundScoresEditModal } from '../../components/admin/playing/SimpleRoundScoresEditModal.jsx'
import { useProjectorScreenSettings } from '../../hooks/useProjectorScreenSettings.js'
import { getTeamRoundScore } from '../../features/tournament/roundScoreLedger.js'
import { VideoSoundControls } from '../../components/admin/playing/VideoSoundControls.jsx'
import {
  isVideoMediaQuestion,
  roundIncludesVideoQuestions,
} from '../../features/media/questionMedia.js'

const TOURNAMENT_PLAY_STEPS = new Set([
  ANCHOR_STEPS.ROUND_SELECT,
  ANCHOR_STEPS.ROUND_START,
  ANCHOR_STEPS.QUESTION_PICK,
  ANCHOR_STEPS.QUESTION_LIVE,
  ANCHOR_STEPS.SIMPLE_ROUND_LIVE,
])

export function PlayingScreenPage({ embedded = false }) {
  const shell = useAdminShell()
  const projectorSettings = useProjectorScreenSettings()
  const [projectorSettingsOpen, setProjectorSettingsOpen] = useState(false)
  const [simpleScoresEditPlanId, setSimpleScoresEditPlanId] = useState(null)
  const {
    state,
    selectTournamentPlan,
    playPlannedRound,
    skipPlannedRound,
    activatePlayQuestion,
    finalizeAndNextQuestion,
    setAnchorStep,
    setPlayEntryStep,
    toggleAnswerVisibility,
    adjustTeamScoreGuarded,
    setLiveSimpleRoundTeamScore,
    setVideoSoundMuted,
    setManualAssignedTeam,
    clearBuzzer,
    setBuzzerSystemEnabled,
    setBuzzerServerUrl,
    setBuzzerSimulationClients,
    setBuzzerShowQrOnProjector,
    applyServerBuzzerWinner,
    armBuzzerForQuestion,
    simulateBuzzerHit,
    setPlayTimerRunning,
    patchPresentationSettings,
    skipIntroPlayback,
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
    setScoreDisplayMode,
    hideProjectorScores,
    toggleScoreAnnouncementVisibility,
    resetTournamentGameplay,
    clearRoundCompleteNotice,
    advanceScorePresentation,
    skipScorePresentation,
    startTotalScoresPresentation,
    stopActiveRoundEarly,
    finishSimpleRound,
    editFinalizedSimpleRoundTeamScore,
    finishQuestionRound,
  } = useGameState()

  usePlayTimer()
  useScoreAnnouncementExpiry()
  const { notify, toasts, dismiss } = shell

  const step = state.playSession?.anchorStep ?? ANCHOR_STEPS.TOURNAMENT_SELECT
  const playPhase = state.playSession?.playPhase ?? 'pick'
  const activeRound = useMemo(
    () => getActiveRoundSnapshot(state.tournament, state.playSession),
    [state.tournament, state.playSession],
  )
  const pendingRound = useMemo(() => {
    const id = state.playSession?.pendingPlanRoundId
    if (!id) return null
    return state.tournament?.plannedRounds?.find((p) => p.id === id) ?? null
  }, [state.playSession?.pendingPlanRoundId, state.tournament?.plannedRounds])
  const playType = resolveRoundPlayType(activeRound)
  const buzzerRound = playType === ROUND_PLAY_TYPE.BUZZER_QUESTION
  const simpleRound = playType === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI
  const questions = state.playSession?.questions ?? []
  const qIndex = state.playSession?.questionIndex ?? 0
  const currentQuestion = questions[qIndex]
  const scoreRecordedForQuestion =
    Boolean(currentQuestion?.id) &&
    state.playSession?.scoreAppliedForQuestionId === currentQuestion.id
  const scoring = activeRound?.scoring ?? { correctPoints: 10, wrongPenalty: 5 }
  const assignedTeam = state.teams?.find((t) => t.id === state.playSession?.assignedTeamId)
  const qrVisible = Boolean(state.buzzerSystem?.showQrOnProjector)
  const hasQuestionMedia = Boolean(currentQuestion?.mediaId)
  const showVideoSoundControls = useMemo(() => {
    if (roundIncludesVideoQuestions(questions, state.mediaLibrary)) return true
    return isVideoMediaQuestion(currentQuestion, state.mediaLibrary)
  }, [questions, state.mediaLibrary, currentQuestion])

  const inTournamentPlay = TOURNAMENT_PLAY_STEPS.has(step)
  const tournamentSessionActive = [
    TOURNAMENT_STATUS.IN_PROGRESS,
    TOURNAMENT_STATUS.PAUSED,
    TOURNAMENT_STATUS.STOPPED,
    TOURNAMENT_STATUS.COMPLETED,
  ].includes(state.tournament?.status)

  useEffect(() => {
    const s = gameStateStore.getState()
    const ts = s.tournament?.status
    const anchor = s.playSession?.anchorStep
    const liveSession = [
      TOURNAMENT_STATUS.IN_PROGRESS,
      TOURNAMENT_STATUS.PAUSED,
      TOURNAMENT_STATUS.STOPPED,
    ].includes(ts)
    if (liveSession && anchor === ANCHOR_STEPS.TOURNAMENT_SELECT) {
      setPlayEntryStep(ANCHOR_STEPS.ROUND_SELECT)
      return
    }
    if (tournamentSessionActive && !s.playSession?.entryResolved) {
      setPlayEntryStep(s.playSession?.anchorStep ?? ANCHOR_STEPS.ROUND_SELECT)
    }
  }, [tournamentSessionActive, setPlayEntryStep])

  useEffect(() => {
    if (step !== ANCHOR_STEPS.ROUND_START) return
    const planId = state.playSession?.pendingPlanRoundId
    if (!planId) {
      setAnchorStep(ANCHOR_STEPS.ROUND_SELECT)
      return
    }
    playPlannedRound(planId)
  }, [step, state.playSession?.pendingPlanRoundId, playPlannedRound, setAnchorStep])

  const handleScore = (teamId, delta, teamName) => {
    const result = adjustTeamScoreGuarded(teamId, delta)
    if (!result.success) {
      notify(result.error, 'warning')
      return
    }
    const team = gameStateStore.getState().teams.find((t) => t.id === teamId)
    if (delta === 0) {
      notify(`${team?.name ?? teamName}: zero recorded (total ${team?.score ?? '—'})`, 'success')
      return
    }
    notify(
      `${team?.name ?? teamName}: ${delta > 0 ? '+' : ''}${delta} → ${team?.score ?? '—'}`,
      'success',
    )
  }

  const handleSetSimpleRoundScore = (teamId, absoluteScore, teamName) => {
    const result = setLiveSimpleRoundTeamScore(teamId, absoluteScore)
    if (!result.success) {
      notify(result.error ?? 'Could not update score.', 'warning')
      return
    }
    const after = gameStateStore.getState()
    const planned = after.tournament?.plannedRounds?.find(
      (p) => p.id === after.playSession?.activePlanRoundId,
    )
    const roundPts = planned ? getTeamRoundScore(planned, teamId) : absoluteScore
    const team = after.teams.find((t) => t.id === teamId)
    notify(
      `${teamName ?? team?.name ?? 'Team'}: round score set to ${roundPts} (tournament ${team?.score ?? '—'})`,
      'success',
    )
  }

  const handleNextQuestion = () => {
    const result = finalizeAndNextQuestion()
    if (result.needsConfirm) {
      const ok = window.confirm(
        'Score update is required for this question.\n\nReturn to scoring and update the score, or press OK to continue without a score for this question only.',
      )
      if (!ok) return
      const forced = finalizeAndNextQuestion({ force: true })
      if (!forced.success) notify(forced.error ?? 'Could not continue.', 'error')
      else if (forced.roundComplete) notify('Round complete.', 'success')
      else notify('Next question loaded.', 'success')
      return
    }
    if (!result.success) {
      notify(result.error ?? 'Could not continue.', 'error')
      return
    }
    if (result.roundComplete) notify('Round complete — choose the next round.', 'success')
    else notify('Next question loaded.', 'success')
  }

  const handlePlayRound = (planRoundId, isSkippedReplay) => {
    let r = playPlannedRound(planRoundId)
    if (r.error === 'CONFIRM_SKIPPED_REPLAY' || r.needsConfirm) {
      const ok = window.confirm(
        'This skipped round has saved progress. Start it over from the beginning?',
      )
      if (!ok) return
      r = playPlannedRound(planRoundId, { confirmDiscardSkipped: true })
    }
    if (!r.success) {
      notify(r.error ?? 'Could not start round.', 'error')
      return
    }
    const after = gameStateStore.getState()
    const anchor = after.playSession?.anchorStep
    if (anchor === ANCHOR_STEPS.SIMPLE_ROUND_LIVE) {
      notify('Round intro — score teams when ready.', 'success')
    } else if (anchor === ANCHOR_STEPS.QUESTION_PICK) {
      notify('Round intro — pick a question number.', 'success')
    } else if (isIntroPlaying(after.presentation)) {
      notify('Round intro playing on projector…', 'info')
    } else if (isSkippedReplay) {
      notify('Skipped round started.', 'info')
    }
  }

  const handleSkipRound = (planRoundId) => {
    const ok = window.confirm(
      'Skip this round for now? It will be marked skipped and you can play it later with Play Skipped Round.',
    )
    if (!ok) return
    const r = skipPlannedRound(planRoundId)
    if (!r.success) notify(r.error ?? 'Could not skip.', 'warning')
    else notify('Round skipped.', 'info')
  }

  const hasMoreQuestionsAfterCurrent = useMemo(() => {
    if (!questions.length) return false
    const simulated = questions.map((q, i) =>
      i === qIndex ? { ...q, status: QUESTION_STATUS.COMPLETED } : q,
    )
    return findNextQuestionIndex({
      ...state.playSession,
      questions: simulated,
    }) >= 0
  }, [questions, qIndex, state.playSession])

  const scoreTeamIds = useMemo(() => {
    if (simpleRound) return state.teams?.map((t) => t.id) ?? []
    if (buzzerRound) {
      const id = state.playSession?.assignedTeamId
      return id ? [id] : []
    }
    if (assignedTeam?.id) return [assignedTeam.id]
    return []
  }, [simpleRound, buzzerRound, assignedTeam?.id, state.playSession?.assignedTeamId, state.teams])

  const activePlannedRound = useMemo(
    () => state.tournament?.plannedRounds?.find((p) => p.id === state.playSession?.activePlanRoundId),
    [state.tournament?.plannedRounds, state.playSession?.activePlanRoundId],
  )

  const simpleRoundScoreByTeamId = useMemo(() => {
    if (!simpleRound || !activePlannedRound) return null
    const map = {}
    for (const team of state.teams ?? []) {
      map[team.id] = getTeamRoundScore(activePlannedRound, team.id)
    }
    return map
  }, [simpleRound, activePlannedRound, state.teams])

  const simpleScoresEditPlanned = useMemo(
    () => state.tournament?.plannedRounds?.find((p) => p.id === simpleScoresEditPlanId) ?? null,
    [state.tournament?.plannedRounds, simpleScoresEditPlanId],
  )

  const enabledScoreTeamIds = useMemo(() => scoreTeamIds, [scoreTeamIds])

  const renderBody = () => {
    if (step === ANCHOR_STEPS.TOURNAMENT_SELECT) {
      return (
        <TournamentSelectGrid
          tournamentInstances={state.tournamentInstances}
          stageProfiles={state.stageProfiles}
          roundLibrary={state.roundLibrary}
          tournamentEventSettings={state.tournamentEventSettings}
          activeTournamentInstanceId={state.activeTournamentInstanceId}
          onSelect={(id) => {
            const r = selectTournamentPlan(id)
            if (!r.success) notify(r.error, 'error')
          }}
        />
      )
    }

    if (step === ANCHOR_STEPS.ROUND_SELECT) {
      return (
        <div className="space-y-3">
          {state.playSession?.roundCompleteNotice && (
            <InlineAlert tone="success" title="Round finished">
              {state.playSession.roundCompleteNotice}
              <Button
                size="sm"
                variant="ghost"
                className="ml-2"
                onClick={() => clearRoundCompleteNotice()}
              >
                Dismiss
              </Button>
            </InlineAlert>
          )}
          <ScorePresentationControls
            scorePresentation={state.scorePresentation}
            onNext={() => advanceScorePresentation()}
            onSkip={() => skipScorePresentation()}
          />
          {grandIntroControlMode(state.presentation) && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/45 bg-gradient-to-r from-amber-950/50 to-slate-900/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-amber-100">Grand opening intro</p>
                <p className="text-xs text-slate-400">
                  Projector shows the intro screen until you start playback.
                </p>
              </div>
              <GrandIntroControls
                presentation={state.presentation}
                onStart={() => {
                  const r = startGrandOpeningIntroPlayback()
                  if (!r.success) notify(r.error ?? 'Could not start intro.', 'warning')
                }}
                onStop={() => {
                  const r = stopGrandOpeningIntroPlayback()
                  if (!r.success) notify(r.error ?? 'Could not stop intro.', 'warning')
                }}
                onRestart={() => {
                  const r = restartGrandOpeningIntroPlayback()
                  if (!r.success) notify(r.error ?? 'Could not restart intro.', 'warning')
                }}
              />
            </div>
          )}
          <RoundSelectGrid
            tournament={state.tournament}
            onPlay={handlePlayRound}
            onSkip={handleSkipRound}
            onShowTotals={() => {
              const r = startTotalScoresPresentation()
              if (!r.success) notify(r.error ?? 'Could not start presentation.', 'warning')
            }}
            onEditSimpleScores={(planId) => setSimpleScoresEditPlanId(planId)}
            onBack={() => setPlayEntryStep(ANCHOR_STEPS.TOURNAMENT_SELECT)}
          />
        </div>
      )
    }

    if (step === ANCHOR_STEPS.ROUND_START) {
      return <p className="text-sm text-slate-400">Starting round — intro on projector…</p>
    }

    if (step === ANCHOR_STEPS.SIMPLE_ROUND_LIVE && playPhase === 'live') {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-100">
            {activeRound?.name ?? state.roundLabel} · Simple Antakshari
          </p>
          <p className="text-sm text-slate-300">{state.question?.prompt}</p>
          <p className="text-xs text-slate-500">
            Use +/− or tap the round score to type a correction. Press Finish to lock scores.
          </p>
          <AdminTeamScoreboard
            teams={state.teams}
            teamIds={scoreTeamIds}
            roundScoreByTeamId={simpleRoundScoreByTeamId}
            onSetRoundScore={handleSetSimpleRoundScore}
            roundScoresLocked={Boolean(activePlannedRound?.simpleScoresFinalized)}
            onAdjustScore={handleScore}
            scoreDelta={scoring}
            compact
          />
          <div className="flex flex-wrap gap-1.5">
            <ScoreAnnouncementToggle
              announcement={state.scoreAnnouncement}
              onToggle={toggleScoreAnnouncementVisibility}
              onNotify={notify}
            />
            <Button
              size="sm"
              variant="gold"
              onClick={() => {
                let r = finishSimpleRound()
                if (!r.success && r.needsConfirm) {
                  const ok = window.confirm(r.error ?? 'Finish this round anyway?')
                  if (!ok) return
                  r = finishSimpleRound({ force: true })
                }
                if (!r.success) notify(r.error ?? 'Could not finish.', 'error')
                else notify('Round finished — scores locked. Presentation on projector.', 'success')
              }}
            >
              Finish
            </Button>
          </div>
        </div>
      )
    }

    if (step === ANCHOR_STEPS.QUESTION_PICK) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-100">{activeRound?.name ?? state.roundLabel}</p>
          <p className="text-xs text-slate-400">Tap a question number — video starts automatically on the projector.</p>
          {showVideoSoundControls && (
            <VideoSoundControls
              videoMuted={Boolean(state.mediaPlayback?.videoMuted)}
              soundBlocked={Boolean(state.mediaPlayback?.videoAutoplaySoundBlocked)}
              onSetMuted={(muted) => setVideoSoundMuted(muted)}
              compact
            />
          )}
          <QuestionNumberCards
            questions={questions}
            questionOrder={state.playSession?.questionOrder}
            currentIndex={qIndex}
            onSelect={(idx) => {
              const r = activatePlayQuestion(idx)
              if (!r.success) notify(r.error, 'warning')
            }}
          />
          <Button size="sm" variant="ghost" onClick={() => setAnchorStep(ANCHOR_STEPS.ROUND_SELECT)}>
            ← Back to rounds
          </Button>
        </div>
      )
    }

    if (step === ANCHOR_STEPS.QUESTION_LIVE && playPhase === 'live') {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-100">
            {activeRound?.name ?? state.roundLabel} · Q{qIndex + 1}/{questions.length}
          </p>

          <PlayTimerPanel
            playTimer={state.playTimer}
            onStart={() => setPlayTimerRunning(true)}
            onPause={() => setPlayTimerRunning(false)}
          />

          {buzzerRound && (
            <div className="space-y-1">
              <CompactBuzzerCard
                buzzer={state.buzzer}
                buzzerSystem={state.buzzerSystem}
                teams={state.teams}
                simulationMode={state.simulationMode}
                onToggleBuzzerEnabled={setBuzzerSystemEnabled}
                onServerUrlChange={setBuzzerServerUrl}
                onToggleSimulationClients={setBuzzerSimulationClients}
                onApplyServerWinner={applyServerBuzzerWinner}
                onArmQuestion={armBuzzerForQuestion}
                onClearBuzzer={clearBuzzer}
                onSimulateLocalBuzzer={() => {
                  simulateBuzzerHit()
                  notify(gameStateStore.getState().buzzer?.announcement ?? 'Buzz', 'info')
                }}
                onNotify={notify}
                showArmReset
              />
              <Button
                size="sm"
                variant={qrVisible ? 'secondary' : 'outline'}
                pressed={qrVisible}
                disabled={!state.buzzerSystem?.enabled}
                onClick={() => {
                  setBuzzerShowQrOnProjector(!qrVisible)
                  notify(
                    !qrVisible ? 'QR shown on projector.' : 'QR hidden on projector.',
                    'info',
                  )
                }}
              >
                {qrVisible ? 'Hide QR' : 'Show QR'}
              </Button>
            </div>
          )}

          {!buzzerRound && (
            <p className="text-sm text-slate-300">
              Team: <span className="font-semibold text-white">{assignedTeam?.name ?? '—'}</span>
            </p>
          )}

          {buzzerRound && !state.buzzerSystem?.enabled && (
            <select
              className="w-full max-w-xs rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
              value={state.playSession?.assignedTeamId ?? ''}
              onChange={(e) => setManualAssignedTeam(e.target.value)}
              aria-label="Manual buzzer team"
            >
              <option value="">Manual winner</option>
              {state.teams?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {showVideoSoundControls && (
            <VideoSoundControls
              videoMuted={Boolean(state.mediaPlayback?.videoMuted)}
              soundBlocked={Boolean(state.mediaPlayback?.videoAutoplaySoundBlocked)}
              onSetMuted={(muted) => setVideoSoundMuted(muted)}
              compact
            />
          )}

          {hasQuestionMedia && (
            <AnchorMinimalMediaControls
              question={currentQuestion}
              round={activeRound}
              onNotify={notify}
            />
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                toggleAnswerVisibility()
                const revealed = gameStateStore.getState().question?.answerRevealed
                notify(revealed ? 'Answer on projector.' : 'Answer hidden.', 'info')
              }}
            >
              {state.question?.answerRevealed ? 'Hide Answer' : 'Reveal Answer'}
            </Button>
            <ScoreAnnouncementToggle
              announcement={state.scoreAnnouncement}
              onToggle={toggleScoreAnnouncementVisibility}
              onNotify={notify}
            />
            <Button
              size="sm"
              variant="gold"
              disabled={!scoreRecordedForQuestion}
              onClick={handleNextQuestion}
            >
              Next Question
            </Button>
            {hasMoreQuestionsAfterCurrent ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const ok = window.confirm(
                    'Stop this round early? Progress will be saved and you can resume later.',
                  )
                  if (!ok) return
                  const r = stopActiveRoundEarly()
                  if (!r.success) notify(r.error ?? 'Could not stop round.', 'error')
                  else notify('Round stopped — scores saved.', 'info')
                }}
              >
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={!scoreRecordedForQuestion}
                onClick={() => {
                  const r = finishQuestionRound()
                  if (!r.success) {
                    notify(r.error ?? 'Complete scoring first.', 'warning')
                    return
                  }
                  notify('Round finished — presentation on projector.', 'success')
                }}
              >
                Finish
              </Button>
            )}
          </div>

          {scoreTeamIds.length > 0 && (
            <AdminTeamScoreboard
              teams={state.teams}
              teamIds={scoreTeamIds}
              enabledTeamIds={enabledScoreTeamIds}
              highlightTeamId={assignedTeam?.id ?? state.playSession?.assignedTeamId}
              onAdjustScore={handleScore}
              scoreDelta={scoring}
              compact
            />
          )}
        </div>
      )
    }

    return null
  }

  return (
    <AdminShell
      embedded={embedded}
      state={shell.state}
      adminRootRef={shell.adminRootRef}
      projectorUrlHint={shell.projectorUrlHint}
      fullscreenActive={shell.fullscreenActive}
      onOpenProjector={shell.handleOpenProjector}
      onOpenProjectorSettings={
        embedded ? undefined : () => setProjectorSettingsOpen(true)
      }
      onFullscreen={shell.handleFullscreen}
      simulationHandlers={embedded ? null : shell.simulationHandlers}
    >
      <header className="mb-2 space-y-2">
        <h2 className="text-base font-bold text-amber-100">Playing Screen</h2>
        {(inTournamentPlay || step === ANCHOR_STEPS.TOURNAMENT_SELECT) && (
          <PlayingContextLines
            state={state}
            step={step}
            activeRound={activeRound}
            pendingRound={pendingRound}
            questionIndex={qIndex}
          />
        )}
        {inTournamentPlay && (
          <div className="flex flex-wrap items-center gap-1.5">
            {canPauseTournament(state) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const r = pauseTournament()
                  if (!r.success) notify(r.error ?? 'Could not pause.', 'warning')
                  else notify('Tournament paused.', 'info')
                }}
              >
                Pause
              </Button>
            )}
            {canResumePausedTournament(state) && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const r = resumePausedTournament()
                  if (!r.success) notify(r.error ?? 'Could not resume.', 'warning')
                  else notify('Tournament resumed.', 'success')
                }}
              >
                Resume
              </Button>
            )}
            <ScoreDisplayControls
              scoreDisplay={state.scoreDisplay}
              onSetMode={(mode) => setScoreDisplayMode(mode)}
              onHideScores={() => hideProjectorScores()}
            />
            {step === ANCHOR_STEPS.ROUND_SELECT && (
              <IntroSettingsMenu
                presentation={state.presentation}
                introPlaying={isIntroPlaying(state.presentation)}
                onToggleSound={(on) => patchPresentationSettings({ soundEnabled: on })}
                onSkip={() => skipIntroPlayback()}
                onReplayGrand={replayGrandOpeningIntro}
                onReplayRound={replayRoundIntro}
                onToggleAutoRound={(on) => patchPresentationSettings({ autoRoundIntro: on })}
                onVolumeChange={(v) => patchPresentationSettings({ volume: v })}
                onNotify={notify}
              />
            )}
            {tournamentSessionActive && (
              <TournamentOptionsMenu
                state={state}
                onStop={stopTournament}
                onResumeStopped={resumeStoppedTournament}
                onComplete={completeTournament}
                onReset={resetTournamentGameplay}
                onNotify={notify}
              />
            )}
          </div>
        )}
      </header>

      <section className="rounded-lg border border-rose-900/30 bg-slate-900/40 p-2">
        {renderBody()}
      </section>

      {!embedded && (
        <p className="mt-1 text-center text-[10px] text-slate-600">
          <Link to="/admin/config" className="underline">Configuration</Link>
        </p>
      )}

      {!embedded && <ToastStack toasts={toasts} onDismiss={dismiss} />}

      <SimpleRoundScoresEditModal
        open={Boolean(simpleScoresEditPlanId)}
        onClose={() => setSimpleScoresEditPlanId(null)}
        roundLabel={simpleScoresEditPlanned?.snapshot?.name ?? 'Simple Antakshari'}
        planned={simpleScoresEditPlanned}
        teams={state.teams}
        onSaveTeamScore={(teamId, score) =>
          editFinalizedSimpleRoundTeamScore(simpleScoresEditPlanId, teamId, score)
        }
        onNotify={notify}
      />

      {!embedded && (
        <ProjectorScreenSettingsModal
          open={projectorSettingsOpen}
          onClose={() => setProjectorSettingsOpen(false)}
          savedSettings={projectorSettings.settings}
          onSave={(next) => projectorSettings.saveSettings(next)}
          onResetDefaults={projectorSettings.resetToDefaults}
          liveGameState={state}
          onNotify={notify}
        />
      )}
    </AdminShell>
  )
}

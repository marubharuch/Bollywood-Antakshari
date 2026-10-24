import { useMemo } from 'react'
import { ANCHOR_STEPS, getActiveRoundSnapshot } from '../../features/tournament/tournamentModel.js'
import { TOURNAMENT_STATUS } from '../../features/tournament/tournamentLifecycle.js'
import { ProjectorPlayTimer } from './ProjectorPlayTimer.jsx'
import { ProjectorTeamTurn } from './ProjectorTeamTurn.jsx'
import { ProjectorBuzzerQr } from './ProjectorBuzzerQr.jsx'
import { ProjectorMediaDisplay } from './ProjectorMediaDisplay.jsx'
import { ProjectorBuzzerBanner } from './ProjectorBuzzerBanner.jsx'
import { ProjectorQuestion, hasProjectorQuestionContent } from './ProjectorQuestion.jsx'
import { ProjectorScoreDisplay } from './ProjectorScoreDisplay.jsx'
import { ProjectorTournamentBanner } from './ProjectorTournamentBanner.jsx'
import { ProjectorIntroLayer } from './ProjectorIntroLayer.jsx'
import { ProjectorScoreAnnouncement } from './ProjectorScoreAnnouncement.jsx'
import { ProjectorScorePresentation } from './ProjectorScorePresentation.jsx'
import {
  isIntroPlaying,
  shouldSuppressMainForIntro,
} from '../../features/presentation/introModel.js'
import { isScorePresentationActive } from '../../features/presentation/scorePresentationModel.js'
import { ROUND_PLAY_TYPE, resolveRoundPlayType } from '../../features/rounds/roundPlayType.js'
import { MAIN_ROUND_TYPE, resolveMainRoundType } from '../../features/rounds/mainRoundType.js'
import { isVideoMediaQuestion } from '../../features/media/questionMedia.js'
import { ProjectorWordReveal } from './ProjectorWordReveal.jsx'

/**
 * Audience-facing projector content (no host toolbar). Used by ProjectorPage and previews.
 */
export function ProjectorStage({
  state,
  appearance,
  hideOverlays = false,
  suppressIntro = false,
  /** Admin settings preview: no full-screen fixed overlays on the laptop viewport */
  previewMode = false,
}) {
  const activeRound = useMemo(
    () => getActiveRoundSnapshot(state.tournament, state.playSession),
    [state.tournament, state.playSession],
  )
  const assignedTeam = useMemo(
    () => state.teams?.find((t) => t.id === state.playSession?.assignedTeamId) ?? null,
    [state.teams, state.playSession?.assignedTeamId],
  )
  const anchorStep = state.playSession?.anchorStep
  const questionActive =
    anchorStep === ANCHOR_STEPS.QUESTION_LIVE && state.playSession?.playPhase === 'live'
  const playType = resolveRoundPlayType(activeRound)
  const buzzerRound = playType === ROUND_PLAY_TYPE.BUZZER_QUESTION
  const scorePresentationActive =
    isScorePresentationActive(state.scorePresentation) && !questionActive
  const tournamentComplete = state.tournament?.status === TOURNAMENT_STATUS.COMPLETED
  const publicBuzzerAnnouncement =
    Boolean(state.buzzer?.announcement) &&
    state.buzzer?.source !== 'manual'
  const showBuzzerOnProjector = questionActive && publicBuzzerAnnouncement
  const questionHideAnswer = Boolean(state.mediaPlayback?.hideAnswerOnProjector)
  const questionHidePrompt = Boolean(state.mediaPlayback?.hideTitleOnProjector)
  const introPlaying = !suppressIntro && isIntroPlaying(state.presentation)
  const introSuppressesMain =
    !suppressIntro && shouldSuppressMainForIntro(state.presentation)
  const showProjectorScores =
    !introPlaying &&
    !introSuppressesMain &&
    (tournamentComplete || Boolean(state.scoreDisplay?.projectorOn))
  const hideMainShell =
    !previewMode &&
    (introSuppressesMain || (scorePresentationActive && !questionActive))
  const questions = state.playSession?.questions ?? []
  const qIndex = state.playSession?.questionIndex ?? 0
  const liveQuestion = useMemo(
    () => questions[qIndex] ?? null,
    [questions, qIndex],
  )

  const isWordRound = resolveMainRoundType(activeRound) === MAIN_ROUND_TYPE.WORD
  const targetWord = (state.question?.prompt ?? '').trim()
  const wordRevealKey =
    liveQuestion?.libraryQuestionId ?? liveQuestion?.id ?? `q-${qIndex}`
  const showWordReveal =
    questionActive && isWordRound && !questionHidePrompt && Boolean(targetWord)

  const showWordAnswerPanel =
    questionActive &&
    isWordRound &&
    !questionHideAnswer &&
    state.question?.answerRevealed &&
    typeof state.question?.hiddenAnswer === 'string' &&
    state.question.hiddenAnswer.trim()

  const showQuestionPanel =
    questionActive &&
    !isWordRound &&
    hasProjectorQuestionContent(state.question, {
      hideAnswer: questionHideAnswer,
      hidePrompt: questionHidePrompt,
    })

  const videoQuestionLive = useMemo(() => {
    if (!questionActive) return false
    if (state.mediaPlayback?.playbackMode === 'audio') return false
    return isVideoMediaQuestion(liveQuestion, state.mediaLibrary)
  }, [
    questionActive,
    liveQuestion,
    state.mediaLibrary,
    state.mediaPlayback?.playbackMode,
  ])

  const showTimer = appearance?.showTimer !== false
  const showRoundTitle = appearance?.showRoundTitle !== false
  const showQuestionNumber = appearance?.showQuestionNumber !== false
  const scoreColumns = appearance?.scoreColumns ?? 'auto'

  if (hideOverlays) {
    return (
      <div className="projector-stage">
        <header className="projector-header">
          <p className="text-[clamp(0.65rem,1.8vw,0.85rem)] uppercase tracking-[0.35em] text-rose-300/90">
            Bollywood Antakshari Tournament
          </p>
          <h1 className="mt-1 bg-gradient-to-r from-amber-200 via-[var(--color-gold)] to-amber-400 bg-clip-text font-black text-transparent">
            {state.stage ?? 'Sample Tournament'}
          </h1>
          {showRoundTitle && (
            <p className="projector-round-line mt-1 text-slate-300">
              Round {state.round ?? 1} — {state.roundLabel ?? 'Sample Round'}
            </p>
          )}
        </header>
        <div className="projector-live">
          <div className="projector-live-meta">
            {showTimer && (
              <ProjectorPlayTimer
                playTimer={{
                  projectorVisible: true,
                  remainingSeconds: 42,
                  running: true,
                  locked: false,
                }}
              />
            )}
            <ProjectorTeamTurn teamName={assignedTeam?.name ?? 'Team Alpha'} manual={false} />
          </div>
          {hasProjectorQuestionContent(state.question, { hideAnswer: true, hidePrompt: false }) && (
            <div className="projector-live-question" style={{ maxHeight: 'none', flex: 1 }}>
              <ProjectorQuestion question={state.question} hideAnswer={true} compact />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {!previewMode && !suppressIntro && <ProjectorIntroLayer />}
      {!previewMode && !questionActive && (
        <ProjectorScorePresentation
          scorePresentation={state.scorePresentation}
          teams={state.teams}
          tournament={state.tournament}
          scoreColumns={scoreColumns}
        />
      )}
      {!previewMode && (
        <ProjectorScoreAnnouncement announcement={state.scoreAnnouncement} />
      )}

      <div
        className={`projector-stage ${videoQuestionLive ? 'projector-stage--video-question' : ''} ${
          showWordReveal ? 'projector-stage--word-round' : ''
        } ${hideMainShell ? 'invisible' : ''}`}
        aria-hidden={hideMainShell}
      >
        <ProjectorTournamentBanner tournament={state.tournament} demoActive={state.demoActive} />

        <header
          className={`projector-header ${videoQuestionLive ? 'projector-header--compact' : ''}`}
        >
          {!videoQuestionLive && (
            <p className="text-[clamp(0.65rem,1.8vw,0.85rem)] uppercase tracking-[0.35em] text-rose-300/90">
              Bollywood Antakshari Tournament
            </p>
          )}
          <h1 className="mt-1 bg-gradient-to-r from-amber-200 via-[var(--color-gold)] to-amber-400 bg-clip-text font-black text-transparent">
            {state.stage}
          </h1>
          {showRoundTitle && (
            <p className="projector-round-line mt-1 text-slate-300">
              Round {state.round} — {state.roundLabel}
            </p>
          )}
          {showQuestionNumber &&
            questionActive &&
            questions.length > 0 &&
            !videoQuestionLive && (
              <p className="mt-0.5 text-[clamp(0.65rem,1.6vw,0.8rem)] uppercase tracking-widest text-slate-500">
                Question {qIndex + 1} of {questions.length}
              </p>
            )}
        </header>

        {showProjectorScores && (
          <div
            className={`projector-scores-pane ${
              questionActive && !videoQuestionLive ? 'projector-scores-pane--compact' : ''
            } ${videoQuestionLive ? 'projector-scores-pane--video-live' : ''}`}
          >
            <ProjectorScoreDisplay
              scoreDisplay={
                tournamentComplete
                  ? {
                      projectorOn: true,
                      mode: state.scoreDisplay?.mode ?? 'all',
                    }
                  : state.scoreDisplay
              }
              teams={state.teams}
              assignedTeamId={state.playSession?.assignedTeamId}
              tournament={state.tournament}
              buzzerRound={buzzerRound}
              inQuestionLive={questionActive}
              fitViewport={!videoQuestionLive}
              scoreColumns={videoQuestionLive ? '4' : scoreColumns}
              scoreboardVariant={videoQuestionLive ? 'strip' : 'default'}
            />
          </div>
        )}

        {!questionActive && (
          <ProjectorBuzzerQr buzzerSystem={state.buzzerSystem} tournament={state.tournament} />
        )}

        {questionActive && (
          <div
            className={`projector-live ${videoQuestionLive ? 'projector-live--video' : ''} ${
              showWordReveal ? 'projector-live--word-round' : ''
            }`}
          >
            <div className="projector-live-meta">
              {showQuestionNumber && videoQuestionLive && questions.length > 0 && (
                <p className="projector-live-qnum" aria-label={`Question ${qIndex + 1} of ${questions.length}`}>
                  Q {qIndex + 1}/{questions.length}
                </p>
              )}
              {showTimer && (
                <ProjectorPlayTimer playTimer={state.playTimer} compact={videoQuestionLive} />
              )}
              <ProjectorTeamTurn
                teamName={assignedTeam?.name ?? state.buzzer?.teamName}
                manual={state.playSession?.manualTeamPick}
                compact={videoQuestionLive}
              />
            </div>

            <div className="projector-live-media">
              <ProjectorMediaDisplay layout="fill" />
            </div>

            {showWordReveal && (
              <ProjectorWordReveal revealKey={wordRevealKey} word={targetWord} />
            )}

            {showWordAnswerPanel && (
              <div className="projector-live-question projector-live-question--word-answer">
                <ProjectorQuestion
                  question={state.question}
                  hideAnswer={false}
                  hidePrompt
                  compact
                />
              </div>
            )}

            {showQuestionPanel && (
              <div className="projector-live-question">
                <ProjectorQuestion
                  question={state.question}
                  hideAnswer={questionHideAnswer}
                  hidePrompt={questionHidePrompt}
                  compact
                />
              </div>
            )}

            {showBuzzerOnProjector && (
              <footer className="projector-live-footer">
                <ProjectorBuzzerBanner buzzer={state.buzzer} />
              </footer>
            )}
          </div>
        )}
      </div>
    </>
  )
}

import { normalizeBuzzer } from '../buzzer/buzzerModel.js'
import { ROUND_PLAY_TYPE, resolveRoundPlayType } from '../rounds/roundPlayType.js'
import {
  ANCHOR_STEPS,
  findNextQuestionIndex,
  normalizePlaySession,
} from './tournamentModel.js'

/**
 * After round cinematic intro, enter the correct live gameplay step.
 * @param {object} prev full game state
 */
export function buildPostRoundIntroGameplayPatch(prev) {
  const session = prev.playSession
  const planId = session?.activePlanRoundId
  if (!planId) return {}
  const planned = prev.tournament?.plannedRounds?.find((p) => p.id === planId)
  const snapshot = planned?.snapshot
  if (!snapshot) return {}

  const playType = resolveRoundPlayType(snapshot)

  if (playType === ROUND_PLAY_TYPE.SIMPLE_ANTAKSHARI) {
    const prompt =
      snapshot.instructions ||
      snapshot.description ||
      `Score each team for ${snapshot.name}`
    return {
      playSession: normalizePlaySession({
        ...session,
        anchorStep: ANCHOR_STEPS.SIMPLE_ROUND_LIVE,
        playPhase: 'live',
        simpleScoredTeamIds: session.simpleScoredTeamIds ?? [],
      }),
      question: {
        ...prev.question,
        prompt,
        letter: '',
        hiddenAnswer: '',
        answerRevealed: false,
      },
      buzzer: normalizeBuzzer({ status: 'idle', source: 'manual' }),
    }
  }

  const nextIdx = findNextQuestionIndex(session)
  if (nextIdx < 0) return {}
  return {
    playSession: normalizePlaySession({
      ...session,
      anchorStep: ANCHOR_STEPS.QUESTION_PICK,
      playPhase: 'pick',
      questionIndex: nextIdx,
    }),
  }
}

export function isQuestionRoundType(snapshot) {
  const t = resolveRoundPlayType(snapshot)
  return t === ROUND_PLAY_TYPE.NON_BUZZER_QUESTION || t === ROUND_PLAY_TYPE.BUZZER_QUESTION
}

export function isBuzzerQuestionRound(snapshot) {
  return resolveRoundPlayType(snapshot) === ROUND_PLAY_TYPE.BUZZER_QUESTION
}

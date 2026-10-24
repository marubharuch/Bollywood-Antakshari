import {
  MAIN_ROUND_TYPE,
  mainTypeNeedsQuestionLibrary,
  resolveMainRoundType,
} from './mainRoundType.js'
import { getSelectedRoundQuestions, validateRoundQuestion } from './roundQuestionModel.js'

/**
 * @param {object} draft
 * @param {{ id?: string }[]} library
 */
export function validateRoundDraft(draft, library = []) {
  const errors = {}

  const name = (draft.name ?? '').trim()
  if (!name) {
    errors.name = 'Round name is required.'
  } else {
    const lower = name.toLowerCase()
    const duplicate = library.some(
      (r) =>
        r.id !== draft.id &&
        (r.name ?? '').trim().toLowerCase() === lower,
    )
    if (duplicate) {
      errors.name = 'Another round already uses this name.'
    }
  }

  const mainType = resolveMainRoundType(draft)

  const correct = Number(draft.scoring?.correctPoints)
  if (Number.isNaN(correct) || correct < 0 || correct > 999) {
    errors.correctPoints = 'Correct points must be 0–999.'
  }

  const wrong = Number(draft.scoring?.wrongPenalty)
  if (Number.isNaN(wrong) || wrong < 0 || wrong > 999) {
    errors.wrongPenalty = 'Wrong penalty must be 0–999.'
  }

  const pass = Number(draft.scoring?.passPoints)
  if (Number.isNaN(pass) || pass < 0 || pass > 999) {
    errors.passPoints = 'Pass points must be 0–999.'
  }

  const useTimer = Boolean(draft.timing?.useTimer)
  if (useTimer) {
    const sec = Number(draft.timing?.timeLimitSeconds)
    if (Number.isNaN(sec) || sec < 1 || sec > 3600) {
      errors.timeLimitSeconds = 'Timer must be 1–3600 seconds.'
    }
  }

  if (mainTypeNeedsQuestionLibrary(mainType)) {
    const questions = Array.isArray(draft.questions) ? draft.questions : []
    const selected = getSelectedRoundQuestions(questions)
    const selectedCount = selected.length

    if (selectedCount < 1) {
      errors.questionCount =
        'Select at least one question for this round (use the checkbox in the question library).'
    } else if (selectedCount > 999) {
      errors.questionCount = 'At most 999 questions can be selected per round.'
    }

    const qCount = Number(draft.rules?.questionCount)
    if (!Number.isNaN(qCount) && selectedCount > 0 && qCount !== selectedCount) {
      errors.questionCount = `Selected question count (${selectedCount}) does not match round settings.`
    }

    selected.forEach((q, i) => {
      const result = validateRoundQuestion(q, mainType, `Question ${i + 1}`)
      if (!result.valid) {
        const key = Object.keys(result.errors)[0]
        errors[`question_${q.id}_${key}`] = result.errors[key]
      }
    })
  } else {
    const qCount = Number(draft.rules?.questionCount)
    if (!Number.isNaN(qCount) && qCount !== 0) {
      errors.questionCount = 'Simple Antakshari rounds do not use a question library.'
    }
  }

  const attempts = Number(draft.rules?.maxAttemptsPerTeam)
  if (Number.isNaN(attempts) || attempts < 1 || attempts > 99) {
    errors.maxAttemptsPerTeam = 'Max attempts must be 1–99.'
  }

  const valid = Object.keys(errors).length === 0
  return { valid, errors, name: valid ? name : undefined }
}

/**
 * @param {object} round snapshot or library round
 */
export function validateRoundHasPlayableQuestions(round) {
  const mainType = resolveMainRoundType(round)
  if (mainType === MAIN_ROUND_TYPE.SIMPLE_ANTAKSHARI) {
    return { valid: true }
  }
  const selected = getSelectedRoundQuestions(round?.questions)
  if (selected.length < 1) {
    return {
      valid: false,
      error:
        'No questions are selected for this round. Open Round Library, check at least one question, and save the round.',
    }
  }
  for (let i = 0; i < selected.length; i += 1) {
    const result = validateRoundQuestion(selected[i], mainType, `Question ${i + 1}`)
    if (!result.valid) {
      return { valid: false, error: result.firstError }
    }
  }
  return { valid: true }
}

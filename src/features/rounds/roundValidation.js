import { ROUND_CATEGORIES } from './roundModel.js'

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

  const category = (draft.category ?? '').trim()
  if (!category) {
    errors.category = 'Choose a category.'
  } else if (!ROUND_CATEGORIES.some((c) => c.id === category)) {
    errors.category = 'Invalid category.'
  }

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

  const qCount = Number(draft.rules?.questionCount)
  if (Number.isNaN(qCount) || qCount < 1 || qCount > 999) {
    errors.questionCount = 'Question count must be 1–999.'
  }

  const attempts = Number(draft.rules?.maxAttemptsPerTeam)
  if (Number.isNaN(attempts) || attempts < 1 || attempts > 99) {
    errors.maxAttemptsPerTeam = 'Max attempts must be 1–99.'
  }

  const valid = Object.keys(errors).length === 0
  return { valid, errors, name: valid ? name : undefined }
}

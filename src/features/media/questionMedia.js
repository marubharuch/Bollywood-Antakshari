/**
 * Resolve anchor/projector media handling for the active question.
 * @param {object | null} question
 * @param {object[]} mediaLibrary
 * @param {object | null} round
 * @returns {'audio'|'video'|'image'|'text'|null}
 */
export function resolveQuestionMediaType(question, mediaLibrary, round) {
  if (question?.mediaId) {
    const item = mediaLibrary?.find((m) => m.id === question.mediaId)
    if (item?.mediaType) return item.mediaType
  }
  if (question?.contentType && question.contentType !== 'text') {
    return question.contentType
  }
  if (round?.rules?.mediaRequired && !question?.mediaId) {
    return null
  }
  return 'text'
}

export function shouldShowAnchorMediaControls(mediaType) {
  return mediaType === 'audio' || mediaType === 'video' || mediaType === 'image'
}

export function isVideoMediaQuestion(question, mediaLibrary) {
  if (!question) return false
  if (question.contentType === 'video') return true
  const item = mediaLibrary?.find((m) => m.id === question.mediaId)
  return item?.mediaType === 'video'
}

export function roundIncludesVideoQuestions(questions, mediaLibrary) {
  return (questions ?? []).some((q) => isVideoMediaQuestion(q, mediaLibrary))
}

const DEFAULT_QUESTION = {
  prompt: 'Name a Bollywood song that begins with the letter…',
  letter: '—',
  hiddenAnswer: '',
  answerRevealed: false,
}

export function hasProjectorQuestionContent(question, { hideAnswer = false, hidePrompt = false } = {}) {
  const q = question ?? DEFAULT_QUESTION
  const showAnswer =
    !hideAnswer && q.answerRevealed && typeof q.hiddenAnswer === 'string' && q.hiddenAnswer.trim()
  const showPrompt = !hidePrompt && typeof q.prompt === 'string' && q.prompt.trim()
  return Boolean(showAnswer || showPrompt)
}

export function ProjectorQuestion({
  question,
  hideAnswer = false,
  hidePrompt = false,
  compact = false,
}) {
  const q = question ?? DEFAULT_QUESTION
  const showAnswer =
    !hideAnswer && q.answerRevealed && typeof q.hiddenAnswer === 'string' && q.hiddenAnswer.trim()
  const showPrompt = !hidePrompt && typeof q.prompt === 'string' && q.prompt.trim()

  if (!showAnswer && !showPrompt) {
    return null
  }

  const pad = compact ? 'px-4 py-3' : 'px-8 py-10'

  return (
    <div
      className={`h-full rounded-xl border border-white/10 bg-black/40 text-center backdrop-blur-sm ${pad}`}
    >
      {showPrompt && (
        <p
          className="text-slate-400 uppercase tracking-[0.15em] break-words"
          style={{ fontSize: compact ? 'clamp(0.7rem, 1.8vh, 1rem)' : 'clamp(0.9rem, 2.2vw, 1.25rem)' }}
        >
          {q.prompt}
        </p>
      )}
      {showAnswer && (
        <p
          className={`animate-buzzer-in font-semibold text-emerald-300 break-words ${
            showPrompt ? (compact ? 'mt-2' : 'mt-4') : ''
          }`}
          style={{
            fontSize: compact ? 'clamp(0.9rem, 2.5vh, 1.25rem)' : 'clamp(1.1rem, 3vw, 1.75rem)',
          }}
        >
          {q.hiddenAnswer}
        </p>
      )}
    </div>
  )
}

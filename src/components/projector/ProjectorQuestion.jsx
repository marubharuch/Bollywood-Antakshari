const DEFAULT_QUESTION = {
  prompt: 'Name a Bollywood song that begins with the letter…',
  letter: '—',
  hiddenAnswer: '',
  answerRevealed: false,
}

export function ProjectorQuestion({ question, hideAnswer = false, hidePrompt = false }) {
  const q = question ?? DEFAULT_QUESTION

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-8 py-10 text-center backdrop-blur-sm">
      {!hidePrompt && (
        <p className="text-lg uppercase tracking-[0.2em] text-slate-400 md:text-xl">
          {q.prompt}
        </p>
      )}
      <p
        className="mt-6 bg-gradient-to-b from-[var(--color-gold)] to-amber-600 bg-clip-text text-7xl font-black text-transparent md:text-8xl"
        aria-label={`Letter ${q.letter}`}
      >
        {q.letter}
      </p>
      <div className="mx-auto mt-10 max-w-2xl border-t border-white/10 pt-8">
        {!hideAnswer && q.answerRevealed ? (
          <p className="animate-buzzer-in text-2xl font-semibold text-emerald-300 md:text-3xl">
            {q.hiddenAnswer}
          </p>
        ) : (
          <p className="text-xl italic text-slate-500 md:text-2xl">
            Answer hidden
          </p>
        )}
      </div>
    </div>
  )
}

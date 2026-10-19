import { Button } from '../common/Button.jsx'
import { Badge } from '../common/Badge.jsx'

export function RoundQuestionPanel({
  stage,
  round,
  roundLabel,
  question,
  onToggleAnswer,
}) {
  const q = question ?? {}
  const revealed = Boolean(q.answerRevealed)

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Current round
        </h2>
        <Badge tone="demo">{stage}</Badge>
      </div>
      <p className="mt-1 text-sm font-semibold text-white">
        Round {round} · {roundLabel}
      </p>

      <div className="mt-2 rounded-md border border-slate-600/80 bg-slate-900/60 p-2.5">
        <p className="text-sm text-slate-300">{q.prompt}</p>
        <p className="mt-1 text-2xl font-bold text-[var(--color-gold)]">
          {q.letter}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700 pt-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase text-slate-500">Projector answer</p>
            {revealed ? (
              <p className="text-sm text-emerald-300">{q.hiddenAnswer}</p>
            ) : (
              <p className="text-sm italic text-slate-500">Hidden</p>
            )}
          </div>
          <Button
            size="sm"
            variant={revealed ? 'outline' : 'gold'}
            pressed={revealed}
            onClick={onToggleAnswer}
          >
            {revealed ? 'Hide Answer' : 'Reveal Answer'}
          </Button>
        </div>
      </div>
    </section>
  )
}

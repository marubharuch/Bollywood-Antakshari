import { QUESTION_STATUS } from '../../../features/tournament/tournamentModel.js'

export function QuestionNumberCards({ questions, questionOrder, currentIndex, onSelect }) {
  const order = questionOrder?.length ? questionOrder : questions.map((_, i) => i)

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Questions">
      {order.map((idx) => {
        const q = questions[idx]
        if (!q) return null
        const isCurrent = idx === currentIndex && q.status === QUESTION_STATUS.CURRENT
        const isDone = q.status === QUESTION_STATUS.COMPLETED
        const label = order.indexOf(idx) + 1
        return (
          <button
            key={q.id}
            type="button"
            disabled={isDone}
            onClick={() => onSelect(idx)}
            className={`flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold transition active:scale-95 ${
              isDone
                ? 'border border-slate-700 bg-slate-900 text-slate-600'
                : isCurrent
                  ? 'border-2 border-amber-400 bg-amber-950/50 text-amber-100'
                  : 'border border-slate-600 bg-slate-800 text-white hover:border-rose-400'
            }`}
            aria-label={`Question ${label}${isDone ? ' completed' : ''}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

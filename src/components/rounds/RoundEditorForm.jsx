import { Button } from '../common/Button.jsx'
import {
  ROUND_CATEGORIES,
  ROUND_PLAY_TYPE,
  roundPlayTypeLabel,
} from '../../features/rounds/roundModel.js'
import { syncRulesForPlayType } from '../../features/rounds/roundPlayType.js'

const inputClass =
  'mt-0.5 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-white focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500'

export function RoundEditorForm({
  draft,
  errors,
  onChange,
  onSave,
  onCancel,
  saveLabel = 'Save Round',
}) {
  const d = draft ?? {}

  const setField = (path, value) => {
    onChange({ ...d, ...path })
  }

  const updateScoring = (key, value) => {
    onChange({ ...d, scoring: { ...d.scoring, [key]: value } })
  }

  const updateTiming = (key, value) => {
    onChange({
      ...d,
      timing: {
        ...d.timing,
        [key]: value,
        ...(key === 'useTimer' && !value ? { timeLimitSeconds: null } : {}),
        ...(key === 'useTimer' && value && !d.timing?.timeLimitSeconds
          ? { timeLimitSeconds: 30 }
          : {}),
      },
    })
  }

  const updateRules = (key, value) => {
    onChange({ ...d, rules: { ...d.rules, [key]: value } })
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-400 sm:col-span-2">
          Round name *
          <input
            className={inputClass}
            value={d.name ?? ''}
            onChange={(e) => setField({ name: e.target.value })}
            maxLength={100}
          />
          {errors?.name && <span className="text-red-300">{errors.name}</span>}
        </label>

        <label className="text-xs text-slate-400 sm:col-span-2">
          Round type *
          <select
            className={inputClass}
            value={d.playType ?? ROUND_PLAY_TYPE.NON_BUZZER_QUESTION}
            onChange={(e) => {
              const playType = e.target.value
              onChange({
                ...d,
                playType,
                rules: syncRulesForPlayType(playType, d.rules),
              })
            }}
          >
            {Object.values(ROUND_PLAY_TYPE).map((id) => (
              <option key={id} value={id}>{roundPlayTypeLabel(id)}</option>
            ))}
          </select>
        </label>

        <label className="text-xs text-slate-400 sm:col-span-2">
          Category *
          <select
            className={inputClass}
            value={d.category ?? 'custom'}
            onChange={(e) => setField({ category: e.target.value })}
          >
            {ROUND_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {errors?.category && (
            <span className="text-red-300">{errors.category}</span>
          )}
        </label>

        <label className="text-xs text-slate-400 sm:col-span-2">
          Short description
          <textarea
            className={`${inputClass} min-h-[3rem]`}
            value={d.description ?? ''}
            onChange={(e) => setField({ description: e.target.value })}
            maxLength={300}
          />
        </label>

        <label className="text-xs text-slate-400 sm:col-span-2">
          Instructions (shown on projector prompt when selected)
          <textarea
            className={`${inputClass} min-h-[3rem]`}
            value={d.instructions ?? ''}
            onChange={(e) => setField({ instructions: e.target.value })}
            maxLength={500}
          />
        </label>
      </div>

      <fieldset className="rounded-md border border-slate-700 p-2">
        <legend className="px-1 text-xs font-semibold text-slate-400">Scoring</legend>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-slate-400">
            Correct +
            <input
              type="number"
              min={0}
              max={999}
              className={inputClass}
              value={d.scoring?.correctPoints ?? 0}
              onChange={(e) => updateScoring('correctPoints', e.target.value)}
            />
            {errors?.correctPoints && (
              <span className="text-red-300">{errors.correctPoints}</span>
            )}
          </label>
          <label className="text-xs text-slate-400">
            Wrong −
            <input
              type="number"
              min={0}
              max={999}
              className={inputClass}
              value={d.scoring?.wrongPenalty ?? 0}
              onChange={(e) => updateScoring('wrongPenalty', e.target.value)}
            />
            {errors?.wrongPenalty && (
              <span className="text-red-300">{errors.wrongPenalty}</span>
            )}
          </label>
          <label className="text-xs text-slate-400">
            Pass +
            <input
              type="number"
              min={0}
              max={999}
              className={inputClass}
              value={d.scoring?.passPoints ?? 0}
              onChange={(e) => updateScoring('passPoints', e.target.value)}
            />
            {errors?.passPoints && (
              <span className="text-red-300">{errors.passPoints}</span>
            )}
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-slate-700 p-2">
        <legend className="px-1 text-xs font-semibold text-slate-400">Timer &amp; rules</legend>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={d.timing?.useTimer ? 'primary' : 'outline'}
            pressed={Boolean(d.timing?.useTimer)}
            onClick={() => updateTiming('useTimer', !d.timing?.useTimer)}
          >
            Timer {d.timing?.useTimer ? 'ON' : 'OFF'}
          </Button>
          <span className="text-xs text-slate-500 self-center">
            Buzzer: {d.rules?.buzzerEnabled ? 'ON' : 'OFF'} (set by round type)
          </span>
          <Button
            type="button"
            size="sm"
            variant={d.rules?.mediaRequired ? 'primary' : 'outline'}
            pressed={Boolean(d.rules?.mediaRequired)}
            onClick={() => updateRules('mediaRequired', !d.rules?.mediaRequired)}
          >
            Media {d.rules?.mediaRequired ? 'Required' : 'Optional'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={d.active ? 'gold' : 'outline'}
            pressed={Boolean(d.active)}
            onClick={() => setField({ active: !d.active })}
          >
            {d.active ? 'Active' : 'Inactive'}
          </Button>
        </div>
        {d.timing?.useTimer && (
          <label className="mt-2 block text-xs text-slate-400">
            Time limit (seconds)
            <input
              type="number"
              min={1}
              max={3600}
              className={inputClass}
              value={d.timing?.timeLimitSeconds ?? 30}
              onChange={(e) => updateTiming('timeLimitSeconds', e.target.value)}
            />
            {errors?.timeLimitSeconds && (
              <span className="text-red-300">{errors.timeLimitSeconds}</span>
            )}
          </label>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            Questions / songs
            <input
              type="number"
              min={1}
              max={999}
              className={inputClass}
              value={d.rules?.questionCount ?? 1}
              onChange={(e) => updateRules('questionCount', e.target.value)}
            />
            {errors?.questionCount && (
              <span className="text-red-300">{errors.questionCount}</span>
            )}
          </label>
          <label className="text-xs text-slate-400">
            Max attempts / team
            <input
              type="number"
              min={1}
              max={99}
              className={inputClass}
              value={d.rules?.maxAttemptsPerTeam ?? 1}
              onChange={(e) => updateRules('maxAttemptsPerTeam', e.target.value)}
            />
            {errors?.maxAttemptsPerTeam && (
              <span className="text-red-300">{errors.maxAttemptsPerTeam}</span>
            )}
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" size="sm" variant="gold">{saveLabel}</Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

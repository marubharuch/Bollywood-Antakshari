import { useState } from 'react'
import { SCORE_DISPLAY_MODE } from '../../../features/presentation/scoreDisplayModel.js'
import { Button } from '../../common/Button.jsx'

export function ScoreDisplayMenu({ scoreDisplay, onSetMode }) {
  const [open, setOpen] = useState(false)
  const on = Boolean(scoreDisplay?.projectorOn)

  const pick = (next) => {
    onSetMode(next)
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        pressed={open}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Score Display{on ? ' · on' : ''}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-md border border-slate-700 bg-slate-900 py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
            onClick={() => pick(SCORE_DISPLAY_MODE.TEAM)}
          >
            Current Team Score
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
            onClick={() => pick(SCORE_DISPLAY_MODE.ROUND)}
          >
            Current Round Score
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
            onClick={() => pick(SCORE_DISPLAY_MODE.ALL)}
          >
            All Played Rounds Score
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full border-t border-slate-800 px-3 py-1.5 text-left text-xs text-slate-400 hover:bg-slate-800"
            onClick={() => pick(SCORE_DISPLAY_MODE.OFF)}
          >
            Hide Scores
          </button>
        </div>
      )}
    </div>
  )
}

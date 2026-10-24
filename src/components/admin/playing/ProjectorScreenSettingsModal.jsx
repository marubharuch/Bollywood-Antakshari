import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../common/Button.jsx'
import { ProjectorAppearanceShell } from '../../projector/ProjectorAppearanceShell.jsx'
import { ProjectorStage } from '../../projector/ProjectorStage.jsx'
import { createProjectorTestGameState } from '../../projector/ProjectorSampleState.js'
import { openProjectorWindow } from '../../../utils/projectorWindow.js'
import {
  DEFAULT_PROJECTOR_SCREEN_SETTINGS,
  PROJECTOR_LAYOUT_DENSITY,
  PROJECTOR_SAFE_MARGIN,
  PROJECTOR_SCORE_COLUMNS,
  PROJECTOR_SCREEN_FIT,
  PROJECTOR_TEXT_SIZE,
} from '../../../features/presentation/projectorScreenSettingsModel.js'

function FieldLabel({ children }) {
  return <p className="mb-1 text-xs font-semibold text-slate-300">{children}</p>
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ProjectorScreenSettingsModal({
  open,
  onClose,
  savedSettings,
  onSave,
  onResetDefaults,
  liveGameState,
  onNotify,
}) {
  const [draft, setDraft] = useState(savedSettings)
  const [panel, setPanel] = useState('settings')

  useEffect(() => {
    if (open) {
      setDraft(savedSettings)
      setPanel('settings')
    }
  }, [open, savedSettings])

  const testState = useMemo(() => createProjectorTestGameState(), [])

  if (!open) return null

  const patch = (partial) => setDraft((prev) => ({ ...prev, ...partial }))

  const handleSave = () => {
    onSave(draft)
    onNotify?.('Projector screen settings saved.', 'success')
  }

  const handleReset = () => {
    const defaults = { ...DEFAULT_PROJECTOR_SCREEN_SETTINGS }
    setDraft(defaults)
    onResetDefaults()
    onNotify?.('Projector settings reset to defaults.', 'info')
  }

  const handleOpenProjector = () => {
    const { blocked, url } = openProjectorWindow()
    if (blocked) {
      onNotify?.(`Popup blocked. Open manually: ${url}`, 'warning')
    } else {
      onNotify?.('Projector window opened. Save settings to apply changes there.', 'info')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="projector-settings-title"
    >
      <div
        className={`flex max-h-[min(96dvh,900px)] w-full flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-2xl ${
          panel === 'test' ? 'max-w-5xl' : 'max-w-4xl'
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-700 px-4 py-3">
          <div>
            <h2 id="projector-settings-title" className="text-base font-bold text-amber-100">
              Projector Screen Settings
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Stays on this laptop until you use <strong>Open Projector Window</strong> after
              connecting a display. Does not change Windows display mode or game data.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </header>

        {panel === 'test' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-slate-700 px-4 py-2 text-xs text-slate-400">
              Test screen — sample layout only (not live game state).
            </div>
            <div className="projector-embed-host relative min-h-0 flex-1 bg-black p-2">
              <ProjectorAppearanceShell settings={draft} embedded className="h-full min-h-[320px]">
                <ProjectorStage
                  state={testState}
                  appearance={draft}
                  suppressIntro
                  previewMode
                />
              </ProjectorAppearanceShell>
            </div>
            <footer className="flex shrink-0 flex-wrap gap-2 border-t border-slate-700 px-4 py-3">
              <Button size="sm" variant="secondary" onClick={() => setPanel('settings')}>
                Back to Settings
              </Button>
              <Button size="sm" variant="gold" onClick={handleSave}>
                Save Settings
              </Button>
            </footer>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_minmax(0,340px)]">
            <div className="min-h-0 overflow-y-auto border-b border-slate-800 px-4 py-3 lg:border-b-0 lg:border-r">
              <div className="space-y-3">
                <section className="rounded-md border border-slate-700/80 bg-slate-950/50 p-3">
                  <FieldLabel>Display setup</FieldLabel>
                  <p className="text-sm text-slate-200">Extended display (recommended)</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    In Windows, set your display mode to <strong>Extend</strong> (not Duplicate),
                    then drag this app&apos;s Projector browser window onto the projector screen.
                    These settings do not change Windows resolution or display mode.
                  </p>
                </section>

                <SelectRow
                  label="Screen fit"
                  value={draft.screenFit}
                  onChange={(v) => patch({ screenFit: v })}
                  options={[
                    { value: PROJECTOR_SCREEN_FIT.AUTO, label: 'Auto fit (viewport)' },
                    { value: PROJECTOR_SCREEN_FIT.HD, label: 'HD profile (1280×720 reference)' },
                    {
                      value: PROJECTOR_SCREEN_FIT.FULL_HD,
                      label: 'Full HD profile (1920×1080 reference)',
                    },
                  ]}
                />

                <SelectRow
                  label="Text size"
                  value={draft.textSize}
                  onChange={(v) => patch({ textSize: v })}
                  options={[
                    { value: PROJECTOR_TEXT_SIZE.MEDIUM, label: 'Medium' },
                    { value: PROJECTOR_TEXT_SIZE.LARGE, label: 'Large (default)' },
                    { value: PROJECTOR_TEXT_SIZE.EXTRA_LARGE, label: 'Extra large' },
                  ]}
                />

                <SelectRow
                  label="Layout density"
                  value={draft.layoutDensity}
                  onChange={(v) => patch({ layoutDensity: v })}
                  options={[
                    { value: PROJECTOR_LAYOUT_DENSITY.COMPACT, label: 'Compact' },
                    { value: PROJECTOR_LAYOUT_DENSITY.BALANCED, label: 'Balanced' },
                    { value: PROJECTOR_LAYOUT_DENSITY.SPACIOUS, label: 'Spacious' },
                  ]}
                />

                <SelectRow
                  label="Safe margin"
                  value={draft.safeMargin}
                  onChange={(v) => patch({ safeMargin: v })}
                  options={[
                    { value: PROJECTOR_SAFE_MARGIN.SMALL, label: 'Small' },
                    { value: PROJECTOR_SAFE_MARGIN.MEDIUM, label: 'Medium' },
                    { value: PROJECTOR_SAFE_MARGIN.LARGE, label: 'Large' },
                  ]}
                />

                <SelectRow
                  label="Scoreboard columns"
                  value={draft.scoreColumns}
                  onChange={(v) => patch({ scoreColumns: v })}
                  options={[
                    { value: PROJECTOR_SCORE_COLUMNS.AUTO, label: 'Auto' },
                    { value: PROJECTOR_SCORE_COLUMNS.TWO, label: '2 columns' },
                    { value: PROJECTOR_SCORE_COLUMNS.THREE, label: '3 columns' },
                    { value: PROJECTOR_SCORE_COLUMNS.FOUR, label: '4 columns' },
                  ]}
                />

                <section className="space-y-2 rounded-md border border-slate-700/80 p-3">
                  <FieldLabel>Display options</FieldLabel>
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={draft.highContrast}
                      onChange={(e) => patch({ highContrast: e.target.checked })}
                    />
                    High contrast
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={draft.showTimer}
                      onChange={(e) => patch({ showTimer: e.target.checked })}
                    />
                    Show timer on projector
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={draft.showRoundTitle}
                      onChange={(e) => patch({ showRoundTitle: e.target.checked })}
                    />
                    Show round title
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={draft.showQuestionNumber}
                      onChange={(e) => patch({ showQuestionNumber: e.target.checked })}
                    />
                    Show question number
                  </label>
                </section>
              </div>
            </div>

            <div className="flex min-h-0 flex-col bg-slate-950/40">
              <p className="shrink-0 px-3 pt-2 text-xs font-semibold text-slate-400">
                Live preview (draft settings · current game)
              </p>
              <div className="projector-embed-host relative m-2 min-h-[200px] flex-1 overflow-hidden rounded-lg border border-slate-700">
                <ProjectorAppearanceShell settings={draft} embedded className="h-full">
                  <ProjectorStage
                    state={liveGameState}
                    appearance={draft}
                    suppressIntro
                    previewMode
                  />
                </ProjectorAppearanceShell>
              </div>
            </div>
          </div>
        )}

        {panel === 'settings' && (
          <footer className="flex shrink-0 flex-wrap gap-2 border-t border-slate-700 px-4 py-3">
            <Button size="sm" variant="outline" onClick={() => setPanel('test')}>
              Test Screen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenProjector}
              title="Opens the audience view in a separate browser window — use after the projector display is connected"
            >
              Open Projector Window…
            </Button>
            <span className="flex-1" />
            <Button size="sm" variant="ghost" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button size="sm" variant="gold" onClick={handleSave}>
              Save Settings
            </Button>
          </footer>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Button } from '../common/Button.jsx'
import { Badge } from '../common/Badge.jsx'
import { InlineAlert } from '../common/InlineAlert.jsx'
import { useBuzzerAdmin } from '../../hooks/useBuzzerAdmin.js'

function connTone(status) {
  if (status === 'connected') return 'live'
  if (status === 'connecting') return 'demo'
  if (status === 'error') return 'paused'
  return 'idle'
}

export function CompactBuzzerCard({
  buzzer,
  buzzerSystem,
  teams,
  simulationMode,
  onToggleBuzzerEnabled,
  onServerUrlChange,
  onToggleSimulationClients,
  onApplyServerWinner,
  onClearBuzzer,
  onSimulateLocalBuzzer,
  onArmQuestion,
  onNotify,
  showArmReset = true,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const enabled = buzzerSystem?.enabled
  const serverUrl = buzzerSystem?.serverUrl ?? 'http://localhost:3847'

  const buzzerAdmin = useBuzzerAdmin({
    enabled,
    serverUrl,
    teams,
    onServerWinner: onApplyServerWinner,
  })

  const handleArm = () => {
    if (buzzerAdmin.connectionStatus !== 'connected') {
      onNotify?.('Buzzer server not connected.', 'error')
      return
    }
    const qid = (buzzer?.questionId ?? 0) + 1
    if (!buzzerAdmin.arm(qid)) {
      onNotify?.('Could not arm buzzer.', 'error')
      return
    }
    onArmQuestion?.(qid)
    onNotify?.('Buzzer armed.', 'success')
  }

  const handleReset = () => {
    if (!buzzerAdmin.reset()) {
      onNotify?.('Buzzer server not connected.', 'error')
      return
    }
    onClearBuzzer?.()
    onNotify?.('Buzzer reset.', 'info')
  }

  const winnerLine =
    buzzer?.teamName ?? buzzer?.announcement ?? (enabled ? 'No winner yet' : 'Buzzer off')

  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/60 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant={enabled ? 'primary' : 'outline'}
          pressed={enabled}
          onClick={() => onToggleBuzzerEnabled(!enabled)}
        >
          Buzzer {enabled ? 'ON' : 'OFF'}
        </Button>
        {enabled && (
          <Badge tone={connTone(buzzerAdmin.connectionStatus)} className="text-[10px]">
            {buzzerAdmin.connectionStatus}
          </Badge>
        )}
        {showArmReset && enabled && buzzerAdmin.connectionStatus === 'connected' && (
          <Button size="sm" variant="gold" onClick={handleArm}>
            Arm
          </Button>
        )}
        {showArmReset && enabled && (
          <Button size="sm" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setSettingsOpen((o) => !o)}>
          {settingsOpen ? 'Hide settings' : 'Buzzer Settings'}
        </Button>
      </div>
      <p className="mt-1 truncate text-xs text-slate-300" aria-live="polite">
        {winnerLine}
      </p>

      {settingsOpen && (
        <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
          <label className="block text-[11px] text-slate-400">
            Server URL
            <input
              className="mt-0.5 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs"
              value={serverUrl}
              onChange={(e) => onServerUrlChange(e.target.value)}
            />
          </label>
          {buzzerAdmin.connectionStatus === 'error' && (
            <InlineAlert tone="error" title="Server unreachable">
              {buzzerAdmin.connectionError ?? 'Start buzzer server on this laptop.'}
            </InlineAlert>
          )}
          <Button
            size="sm"
            variant={buzzerSystem?.simulationClients ? 'secondary' : 'outline'}
            pressed={Boolean(buzzerSystem?.simulationClients)}
            onClick={() => onToggleSimulationClients(!buzzerSystem?.simulationClients)}
          >
            Sim clients {buzzerSystem?.simulationClients ? 'ON' : 'OFF'}
          </Button>
          {buzzerSystem?.simulationClients && (
            <div className="flex flex-wrap gap-1">
              {teams.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!buzzerAdmin.simulateBuzz(t.id)) {
                      onNotify?.('Connect server and arm first.', 'warning')
                    }
                  }}
                >
                  {t.name}
                </Button>
              ))}
            </div>
          )}
          {!enabled && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!simulationMode}
              onClick={onSimulateLocalBuzzer}
            >
              Demo buzz
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

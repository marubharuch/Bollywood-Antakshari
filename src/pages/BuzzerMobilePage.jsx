import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../components/common/Badge.jsx'
import { useGameState } from '../hooks/useGameState.js'
import {
  clientBuzz,
  createBuzzerSocket,
  registerClient,
} from '../features/buzzer/buzzerSocket.js'

export function BuzzerMobilePage() {
  const [params] = useSearchParams()
  const { state } = useGameState()
  const serverUrl = (params.get('server') ?? '').trim()
  const tournamentLabel = (params.get('tournament') ?? '').trim()

  const [teamId, setTeamId] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [serverPhase, setServerPhase] = useState('idle')
  const [feedback, setFeedback] = useState('Select your team and connect.')
  const [registered, setRegistered] = useState(false)
  const socketRef = useRef(null)
  const teamIdRef = useRef(teamId)
  teamIdRef.current = teamId

  const teams = state.teams ?? []

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === teamId) ?? null,
    [teams, teamId],
  )

  useEffect(() => {
    if (!serverUrl) {
      setConnectionStatus('disconnected')
      setFeedback('Missing server URL. Open the link from the admin panel.')
      return
    }

    setConnectionStatus('connecting')
    const socket = createBuzzerSocket(serverUrl, {
      onConnection: (status, message) => {
        if (status === 'connected') {
          setConnectionStatus('connected')
          setFeedback('Connected. Select team and tap BUZZ.')
        } else if (status === 'disconnected') {
          setConnectionStatus('disconnected')
          setRegistered(false)
          setFeedback('Disconnected. Reconnecting…')
        } else if (status === 'error') {
          setConnectionStatus('error')
          setFeedback(message ?? 'Cannot reach server.')
        }
      },
      onState: (s) => {
        setServerPhase(s?.phase ?? 'idle')
      },
      onRejected: (data) => {
        const map = {
          not_armed: 'Wait for the host to start the question.',
          locked: 'Buzzer locked — another team was first.',
          already_buzzed: 'Your team already buzzed this question.',
          invalid_team: 'Invalid team.',
        }
        setFeedback(map[data?.reason] ?? 'Buzz rejected.')
      },
      onWinner: (winner) => {
        if (winner.teamId === teamIdRef.current) {
          setFeedback('Accepted — you buzzed first!')
        } else {
          setFeedback(`Locked — ${winner.teamName} was first.`)
        }
      },
    })

    socketRef.current = socket
    return () => {
      socket.disconnect()
      socketRef.current = null
      setRegistered(false)
    }
  }, [serverUrl])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket || connectionStatus !== 'connected' || !teamId || !selectedTeam) {
      setRegistered(false)
      return
    }
    registerClient(socket, teamId, selectedTeam.name)
    setRegistered(true)
    setFeedback(`Registered as ${selectedTeam.name}. Ready to buzz.`)
  }, [connectionStatus, teamId, selectedTeam])

  const handleBuzz = () => {
    if (!socketRef.current || !registered) {
      setFeedback('Connect and select a team first.')
      return
    }
    clientBuzz(socketRef.current)
    setFeedback('Buzz sent…')
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <h1 className="text-center text-lg font-bold">Team Buzzer</h1>
      {tournamentLabel && (
        <p className="text-center text-xs text-amber-200/90">{tournamentLabel}</p>
      )}
      <p className="mt-1 text-center text-xs text-slate-400">
        Same Wi-Fi / hotspot as the quiz laptop
      </p>

      <div className="mx-auto mt-4 max-w-md space-y-3">
        <Badge tone={connectionStatus === 'connected' ? 'live' : 'paused'}>
          {connectionStatus}
        </Badge>
        <Badge tone="idle">Phase: {serverPhase}</Badge>

        {!serverUrl && (
          <p className="text-sm text-red-300">
            Add ?server=http://LAPTOP-IP:3847 to the URL (use admin QR/link).
          </p>
        )}

        <label className="block text-sm text-slate-300">
          Your team
          <select
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-base"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">— Select —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="w-full rounded-2xl bg-rose-600 py-10 text-3xl font-black uppercase shadow-lg active:scale-[0.98] disabled:opacity-40"
          disabled={
            connectionStatus !== 'connected' ||
            !registered ||
            serverPhase !== 'armed'
          }
          onClick={handleBuzz}
        >
          BUZZ
        </button>

        <p className="text-center text-sm text-amber-100" aria-live="polite">
          {feedback}
        </p>
      </div>
    </div>
  )
}

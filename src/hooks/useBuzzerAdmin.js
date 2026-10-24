import { useEffect, useRef, useState } from 'react'
import {
  armBuzzer,
  createBuzzerSocket,
  registerAdmin,
  resetBuzzerServer,
  simulateServerBuzz,
  syncTeams,
} from '../features/buzzer/buzzerSocket.js'

export function useBuzzerAdmin({
  enabled,
  serverUrl,
  teams,
  onServerWinner,
  onServerState,
}) {
  const socketRef = useRef(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [connectionError, setConnectionError] = useState(null)
  const [serverState, setServerState] = useState(null)

  useEffect(() => {
    if (!enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setConnectionStatus('disconnected')
      setConnectionError(null)
      setServerState(null)
      return
    }

    setConnectionStatus('connecting')
    setConnectionError(null)

    const socket = createBuzzerSocket(serverUrl, {
      onConnection: (status, message) => {
        if (status === 'connected') {
          setConnectionStatus('connected')
          setConnectionError(null)
          registerAdmin(socket)
          syncTeams(socket, teams)
        } else if (status === 'disconnected') {
          setConnectionStatus('disconnected')
        } else if (status === 'error') {
          setConnectionStatus('error')
          setConnectionError(message ?? 'Cannot reach buzzer server.')
        }
      },
      onState: (state) => {
        setServerState(state)
        onServerState?.(state)
      },
      onWinner: (winner) => onServerWinner?.(winner),
      onError: (msg) => setConnectionError(msg),
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, serverUrl])

  useEffect(() => {
    if (!enabled || connectionStatus !== 'connected' || !socketRef.current) return
    syncTeams(socketRef.current, teams)
  }, [enabled, connectionStatus, teams])

  const arm = (questionId) => {
    if (!socketRef.current || connectionStatus !== 'connected') return false
    armBuzzer(socketRef.current, questionId)
    return true
  }

  const reset = () => {
    if (!socketRef.current || connectionStatus !== 'connected') return false
    resetBuzzerServer(socketRef.current)
    return true
  }

  const simulateBuzz = (teamId) => {
    if (!socketRef.current || connectionStatus !== 'connected') return false
    simulateServerBuzz(socketRef.current, teamId)
    return true
  }

  return {
    connectionStatus,
    connectionError,
    serverState,
    arm,
    reset,
    simulateBuzz,
  }
}

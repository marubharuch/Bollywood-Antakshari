import { useEffect } from 'react'
import { useGameState } from './useGameState.js'

export function usePlayTimer() {
  const { state, tickPlayTimer } = useGameState()
  const running = Boolean(state.playTimer?.running)
  const epoch = state.playTimer?.epoch ?? 0

  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => tickPlayTimer(epoch), 1000)
    return () => window.clearInterval(id)
  }, [running, epoch, tickPlayTimer])
}

import { useCallback, useState } from 'react'

let toastId = 0

export function useToasts() {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback((message, tone = 'info') => {
    const id = ++toastId
    setToasts((list) => [...list.slice(-4), { id, message, tone }])
    window.setTimeout(() => dismiss(id), 3200)
    return id
  }, [dismiss])

  return { toasts, notify, dismiss }
}

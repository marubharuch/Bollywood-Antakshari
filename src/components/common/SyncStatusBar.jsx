export function SyncStatusBar({ updatedAt, note }) {
  const label = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—'

  return (
    <p className={`text-[10px] text-slate-500 ${note ? '' : ''}`}>
      State synced · {label}
      {note ? ` · ${note}` : ''}
    </p>
  )
}

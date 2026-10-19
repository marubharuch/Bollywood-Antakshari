import { Badge } from './Badge.jsx'
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js'

export function ConnectionStatus({ className = '' }) {
  const online = useOnlineStatus()

  return (
    <Badge tone={online ? 'live' : 'paused'} className={className}>
      {online ? 'Online' : 'Offline'}
    </Badge>
  )
}

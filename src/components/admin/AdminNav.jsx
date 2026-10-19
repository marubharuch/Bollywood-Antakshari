import { Link, useLocation } from 'react-router-dom'
import { Button } from '../common/Button.jsx'

export function AdminNav({ embedded = false }) {
  const location = useLocation()
  if (embedded) return null

  const onControl = location.pathname === '/' || location.pathname === '/admin'
  const onTeams = location.pathname === '/teams'

  return (
    <nav
      className="flex flex-wrap gap-1"
      aria-label="Admin sections"
    >
      <Link to="/">
        <Button size="sm" variant={onControl ? 'secondary' : 'ghost'} pressed={onControl}>
          Control Panel
        </Button>
      </Link>
      <Link to="/teams">
        <Button size="sm" variant={onTeams ? 'secondary' : 'ghost'} pressed={onTeams}>
          Manage Teams
        </Button>
      </Link>
    </nav>
  )
}

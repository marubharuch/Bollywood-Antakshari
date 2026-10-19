import { Link, useLocation } from 'react-router-dom'
import { Button } from '../common/Button.jsx'

export function AdminNav({ embedded = false }) {
  const location = useLocation()
  if (embedded) return null

  const onControl = location.pathname === '/' || location.pathname === '/admin'
  const onTeams = location.pathname === '/teams'
  const onRounds = location.pathname === '/rounds'
  const onMedia = location.pathname === '/media'

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
          Teams
        </Button>
      </Link>
      <Link to="/rounds">
        <Button size="sm" variant={onRounds ? 'secondary' : 'ghost'} pressed={onRounds}>
          Rounds
        </Button>
      </Link>
      <Link to="/media">
        <Button size="sm" variant={onMedia ? 'secondary' : 'ghost'} pressed={onMedia}>
          Media
        </Button>
      </Link>
    </nav>
  )
}

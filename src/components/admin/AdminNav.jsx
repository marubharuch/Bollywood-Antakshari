import { NavLink } from 'react-router-dom'
import { Button } from '../common/Button.jsx'

const SECTIONS = [
  { to: '/admin/config', label: 'Tournaments' },
  { to: '/admin/play', label: 'Playing Screen' },
  { to: '/rounds', label: 'Round Library' },
  { to: '/media', label: 'Media Library' },
]

export function AdminNav({ embedded = false }) {
  if (embedded) return null

  return (
    <nav className="flex flex-wrap gap-1" aria-label="Admin sections">
      {SECTIONS.map(({ to, label }) => (
        <NavLink key={to} to={to} end={to !== '/admin/config'}>
          {({ isActive }) => (
            <Button size="sm" variant={isActive ? 'secondary' : 'ghost'} pressed={isActive}>
              {label}
            </Button>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

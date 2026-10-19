import { Link } from 'react-router-dom'
import { Badge } from '../components/common/Badge.jsx'
import { Button } from '../components/common/Button.jsx'
import { AdminPage } from './AdminPage.jsx'
import { ProjectorPage } from './ProjectorPage.jsx'

export function SplitScreenTestPage() {
  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-violet-700/50 bg-violet-950/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <Badge tone="dev">Split-Screen Test Mode</Badge>
          <span className="text-sm text-violet-100">
            Admin and Projector side by side — same sync channel as separate tabs.
          </span>
        </div>
        <Link to="/">
          <Button size="sm" variant="outline">Exit to Admin</Button>
        </Link>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-slate-700 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="min-h-0 overflow-hidden">
          <p className="bg-slate-900 px-3 py-1 text-center text-xs text-slate-500">
            Admin (embedded)
          </p>
          <div className="h-[calc(100%-1.5rem)] overflow-auto">
            <AdminPage embedded />
          </div>
        </div>
        <div className="min-h-0 overflow-hidden">
          <p className="bg-black px-3 py-1 text-center text-xs text-slate-500">
            Projector (embedded)
          </p>
          <div className="h-[calc(100%-1.5rem)] overflow-auto">
            <ProjectorPage embedded showPresentationControls={false} />
          </div>
        </div>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Badge } from '../components/common/Badge.jsx'
import { Button } from '../components/common/Button.jsx'
import { AdminPage } from './AdminPage.jsx'
import { ProjectorPage } from './ProjectorPage.jsx'
import '../components/projector/projectorLayout.css'

export function SplitScreenTestPage() {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-slate-950">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-violet-700/50 bg-violet-950/40 px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <Badge tone="dev">Split-Screen Test Mode</Badge>
          <span className="text-sm text-violet-100">
            Admin (left) and Projector preview (right) — projector overlays stay in the right
            panel only.
          </span>
        </div>
        <Link to="/admin/play" className="shrink-0">
          <Button size="sm" variant="outline">Exit to Playing Screen</Button>
        </Link>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-slate-700 overflow-hidden lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <p className="shrink-0 bg-slate-900 px-3 py-1 text-center text-xs text-slate-500">
            Host / Playing Screen (embedded)
          </p>
          <div className="min-h-0 flex-1 overflow-auto">
            <AdminPage embedded />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-black">
          <p className="shrink-0 bg-black px-3 py-1 text-center text-xs text-slate-500">
            Projector (embedded — not full laptop)
          </p>
          <div className="projector-embed-host min-h-0 flex-1 overflow-hidden">
            <ProjectorPage embedded showPresentationControls={false} />
          </div>
        </div>
      </div>
    </div>
  )
}

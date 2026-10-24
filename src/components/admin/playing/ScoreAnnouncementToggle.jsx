import { Button } from '../../common/Button.jsx'
import {
  isScoreAnnouncementActive,
  isScoreAnnouncementProjectorVisible,
} from '../../../features/presentation/scoreAnnouncementModel.js'

function EyeIcon({ off }) {
  if (off) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58M9.88 5.09A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a17.5 17.5 0 0 1-3.07 4.17M6.12 6.12A17.5 17.5 0 0 0 2 12c0 0 3 7 10 7 1.02 0 1.98-.15 2.88-.41"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

export function ScoreAnnouncementToggle({ announcement, onToggle, onNotify }) {
  const active = isScoreAnnouncementActive(announcement)
  const visible = isScoreAnnouncementProjectorVisible(announcement)
  const label = visible ? 'Hide Score Announcement' : 'Show Score Announcement'

  return (
    <Button
      size="sm"
      variant="ghost"
      className="!px-2"
      disabled={!active}
      aria-label={label}
      title={active ? label : 'No score announcement active'}
      onClick={() => {
        const r = onToggle()
        if (!r.success) {
          onNotify?.(r.error ?? 'No announcement to show.', 'info')
          return
        }
        onNotify?.(
          visible ? 'Score announcement hidden on projector.' : 'Score announcement shown on projector.',
          'info',
        )
      }}
    >
      <EyeIcon off={active && !visible} />
    </Button>
  )
}

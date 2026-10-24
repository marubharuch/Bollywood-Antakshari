import { Button } from '../../common/Button.jsx'
import { grandIntroControlMode } from '../../../features/presentation/introModel.js'

export function GrandIntroControls({
  presentation,
  onStart,
  onStop,
  onRestart,
}) {
  const mode = grandIntroControlMode(presentation)
  if (!mode) return null

  if (mode === 'start') {
    return (
      <Button size="md" variant="gold" onClick={onStart}>
        Start Intro
      </Button>
    )
  }
  if (mode === 'stop') {
    return (
      <Button size="md" variant="secondary" onClick={onStop}>
        Stop Intro
      </Button>
    )
  }
  return (
    <Button size="md" variant="outline" onClick={onRestart}>
      Restart Intro
    </Button>
  )
}

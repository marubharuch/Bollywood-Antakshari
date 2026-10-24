export const INTRO_KIND = {
  NONE: 'none',
  GRAND: 'grand_opening',
  ROUND: 'round',
}

export const INTRO_STATUS = {
  IDLE: 'idle',
  READY: 'ready',
  PLAYING: 'playing',
  SKIPPED: 'skipped',
  DONE: 'done',
}

export const GRAND_INTRO_MS = 26000
export const ROUND_INTRO_MS = 10000

export function normalizePresentation(raw) {
  const base = {
    soundEnabled: true,
    volume: 0.75,
    autoRoundIntro: true,
    grandOpeningPlayedForTournamentId: null,
    pendingRoundIntroPlanId: null,
    intro: normalizeIntroPlayback(null),
  }
  if (!raw || typeof raw !== 'object') return base
  return {
    soundEnabled: raw.soundEnabled !== false,
    volume:
      typeof raw.volume === 'number' ? Math.min(1, Math.max(0, raw.volume)) : base.volume,
    autoRoundIntro: raw.autoRoundIntro !== false,
    grandOpeningPlayedForTournamentId:
      typeof raw.grandOpeningPlayedForTournamentId === 'string'
        ? raw.grandOpeningPlayedForTournamentId
        : null,
    pendingRoundIntroPlanId:
      typeof raw.pendingRoundIntroPlanId === 'string'
        ? raw.pendingRoundIntroPlanId
        : null,
    intro: normalizeIntroPlayback(raw.intro),
  }
}

export function normalizeIntroPlayback(raw) {
  const base = {
    kind: INTRO_KIND.NONE,
    token: null,
    status: INTRO_STATUS.IDLE,
    stageLine: '',
    roundLine: '',
    planRoundId: null,
    tournamentId: null,
    holdElapsedMs: null,
  }
  if (!raw || typeof raw !== 'object') return base
  const kind = [INTRO_KIND.NONE, INTRO_KIND.GRAND, INTRO_KIND.ROUND].includes(raw.kind)
    ? raw.kind
    : base.kind
  const status = [
    INTRO_STATUS.IDLE,
    INTRO_STATUS.READY,
    INTRO_STATUS.PLAYING,
    INTRO_STATUS.SKIPPED,
    INTRO_STATUS.DONE,
  ].includes(raw.status)
    ? raw.status
    : base.status
  return {
    kind,
    token: typeof raw.token === 'string' ? raw.token : null,
    status,
    holdElapsedMs:
      typeof raw.holdElapsedMs === 'number' && Number.isFinite(raw.holdElapsedMs)
        ? raw.holdElapsedMs
        : null,
    stageLine: typeof raw.stageLine === 'string' ? raw.stageLine : '',
    roundLine: typeof raw.roundLine === 'string' ? raw.roundLine : '',
    planRoundId: typeof raw.planRoundId === 'string' ? raw.planRoundId : null,
    tournamentId: typeof raw.tournamentId === 'string' ? raw.tournamentId : null,
  }
}

export function isIntroPlaying(presentation) {
  return presentation?.intro?.status === INTRO_STATUS.PLAYING
}

export function isGrandIntroActive(presentation) {
  const intro = presentation?.intro
  if (intro?.kind !== INTRO_KIND.GRAND) return false
  return (
    intro.status === INTRO_STATUS.READY ||
    intro.status === INTRO_STATUS.PLAYING ||
    intro.status === INTRO_STATUS.DONE
  )
}

/** Hide main projector gameplay while grand intro is on dark, playing, or final hold frame. */
export function shouldSuppressMainForIntro(presentation) {
  if (isIntroPlaying(presentation)) return true
  const intro = presentation?.intro
  if (intro?.kind !== INTRO_KIND.GRAND) return false
  return intro.status === INTRO_STATUS.READY || intro.status === INTRO_STATUS.DONE
}

export function grandIntroControlMode(presentation) {
  const intro = presentation?.intro
  if (intro?.kind !== INTRO_KIND.GRAND) return null
  if (intro.status === INTRO_STATUS.READY || intro.status === INTRO_STATUS.SKIPPED) {
    return 'start'
  }
  if (intro.status === INTRO_STATUS.PLAYING) return 'stop'
  if (intro.status === INTRO_STATUS.DONE) return 'restart'
  return null
}

/**
 * @param {object} tournament
 * @param {number} planIndex
 * @param {object} planned
 */
export function buildRoundIntroLines(tournament, planIndex, planned) {
  const stageName = (tournament?.name ?? 'Tournament').trim()
  const roundNum = planIndex + 1
  const snapshotName = (planned?.snapshot?.name ?? '').trim()
  const tournamentRoundLabel = `${stageName} ${roundNum}`.trim().toUpperCase()
  const roundTitle = snapshotName
    ? snapshotName.toUpperCase()
    : `ROUND ${roundNum}`

  const stageUpper = stageName.toUpperCase()
  const isGrandFinaleStage =
    /grand\s*finale|the\s*final/i.test(stageUpper) ||
    (stageUpper === 'FINAL' && roundNum === (tournament?.plannedRounds?.length ?? roundNum))

  if (isGrandFinaleStage) {
    return {
      stageLine: 'THE GRAND FINALE',
      roundLine: roundTitle,
    }
  }

  if (/^final$/i.test(stageName)) {
    return {
      stageLine: 'THE GRAND FINALE',
      roundLine: roundTitle,
    }
  }

  return {
    stageLine: tournamentRoundLabel,
    roundLine: roundTitle,
  }
}

export function createIntroToken(kind, id) {
  return `${kind}-${id}-${Date.now()}`
}

export function introDurationMs(kind, reducedMotion) {
  if (reducedMotion) {
    return kind === INTRO_KIND.GRAND ? 8000 : 4000
  }
  return kind === INTRO_KIND.GRAND ? GRAND_INTRO_MS : ROUND_INTRO_MS
}

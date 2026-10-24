export const SCORE_PRESENTATION_KIND = {
  NONE: 'none',
  ROUND_END: 'round_end',
  TOTAL_ASCENDING: 'total_ascending',
}

export const SCORE_PRESENTATION_PHASE = {
  IDLE: 'idle',
  TEAM: 'team',
  SCOREBOARD: 'scoreboard',
}

export function normalizeScorePresentation(raw) {
  const base = {
    active: false,
    kind: SCORE_PRESENTATION_KIND.NONE,
    phase: SCORE_PRESENTATION_PHASE.IDLE,
    teamOrder: [],
    teamIndex: 0,
    planRoundId: null,
    priorScoreDisplay: null,
  }
  if (!raw || typeof raw !== 'object') return base
  const kind = Object.values(SCORE_PRESENTATION_KIND).includes(raw.kind)
    ? raw.kind
    : base.kind
  const phase = Object.values(SCORE_PRESENTATION_PHASE).includes(raw.phase)
    ? raw.phase
    : base.phase
  return {
    active: Boolean(raw.active),
    kind,
    phase,
    teamOrder: Array.isArray(raw.teamOrder)
      ? raw.teamOrder.filter((id) => typeof id === 'string')
      : [],
    teamIndex: typeof raw.teamIndex === 'number' ? Math.max(0, raw.teamIndex) : 0,
    planRoundId: typeof raw.planRoundId === 'string' ? raw.planRoundId : null,
    priorScoreDisplay:
      raw.priorScoreDisplay && typeof raw.priorScoreDisplay === 'object'
        ? raw.priorScoreDisplay
        : null,
  }
}

export function isScorePresentationActive(presentation) {
  return Boolean(presentation?.active) && presentation.phase !== SCORE_PRESENTATION_PHASE.IDLE
}

/** Lowest cumulative score first; stable order for ties. */
export function teamOrderByAscendingTotal(teams) {
  const list = [...(teams ?? [])]
  list.sort((a, b) => {
    const diff = (a.score ?? 0) - (b.score ?? 0)
    if (diff !== 0) return diff
    return String(a.name).localeCompare(String(b.name))
  })
  return list.map((t) => t.id)
}

/** Configured tournament team order for round-end reveals. */
export function teamOrderForRoundReveal(teams, playSettings) {
  const ids = teams?.map((t) => t.id) ?? []
  if (playSettings?.teamOrderMode === 'shuffle' && playSettings?.allowTeamShuffle) {
    return [...ids].sort(() => Math.random() - 0.5)
  }
  return ids
}

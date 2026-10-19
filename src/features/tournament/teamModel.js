/** @typedef {'quarter-final' | 'semi-final' | 'final'} TournamentStageId */

export const TOURNAMENT_STAGES = ['quarter-final', 'semi-final', 'final']

export const DEFAULT_TEAM_COLORS = [
  '#e11d48',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#16a34a',
  '#db2777',
  '#ca8a04',
  '#4f46e5',
]

/** Reserved for Phase 3: qualification and match slots. */
export const DEFAULT_TOURNAMENT_TEAM_META = {
  eligibleStages: [...TOURNAMENT_STAGES],
  qualifiedStage: null,
  matchAssignmentId: null,
}

export function createTeamId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `team-${crypto.randomUUID()}`
  }
  return `team-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * @param {object | null | undefined} raw
 * @param {number} fallbackIndex
 */
export function normalizeTeam(raw, fallbackIndex = 0) {
  if (!raw || typeof raw !== 'object') return null

  const id =
    typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createTeamId()
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim()
      : 'Unnamed Team'
  const score =
    typeof raw.score === 'number' && !Number.isNaN(raw.score)
      ? Math.max(0, Math.round(raw.score))
      : 0
  const accent =
    (typeof raw.accent === 'string' && raw.accent) ||
    (typeof raw.color === 'string' && raw.color) ||
    DEFAULT_TEAM_COLORS[fallbackIndex % DEFAULT_TEAM_COLORS.length]

  const tournament = {
    ...DEFAULT_TOURNAMENT_TEAM_META,
    ...(raw.tournament && typeof raw.tournament === 'object'
      ? raw.tournament
      : {}),
  }

  return { id, name, score, accent, tournament }
}

/**
 * @param {unknown} rawTeams
 * @param {object[]} defaultTeams
 */
export function normalizeTeamsList(rawTeams, defaultTeams) {
  if (!Array.isArray(rawTeams)) {
    return defaultTeams
      .map((team, index) => normalizeTeam(team, index))
      .filter(Boolean)
  }

  return rawTeams
    .map((team, index) => normalizeTeam(team, index))
    .filter((team) => team && team.id)
}

export function pickAvailableTeamColor(teams) {
  const used = new Set(
    (teams ?? []).map((t) => (t.accent ?? '').toLowerCase()).filter(Boolean),
  )
  const free = DEFAULT_TEAM_COLORS.find((c) => !used.has(c.toLowerCase()))
  if (free) return free
  return DEFAULT_TEAM_COLORS[(teams?.length ?? 0) % DEFAULT_TEAM_COLORS.length]
}

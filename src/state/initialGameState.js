import {
  normalizeMediaLibrary,
  normalizeMediaPlayback,
} from '../features/media/mediaModel.js'
import {
  EXAMPLE_ROUND_TEMPLATES,
  normalizeRoundLibrary,
} from '../features/rounds/roundModel.js'
import { normalizeTeam, normalizeTeamsList } from '../features/tournament/teamModel.js'

/** @typedef {'idle' | 'demo' | 'live' | 'paused'} EventStatus */
/** @typedef {'idle' | 'ready' | 'active' | 'locked'} BuzzerStatus */

const SAMPLE_TEAMS = [
  { id: 'team-1', name: 'Team Rang De', score: 120, accent: '#e11d48' },
  { id: 'team-2', name: 'Team Dil Se', score: 95, accent: '#7c3aed' },
  { id: 'team-3', name: 'Team Taal', score: 110, accent: '#0891b2' },
  { id: 'team-4', name: 'Team Josh', score: 80, accent: '#ea580c' },
]

export function createInitialGameState(overrides = {}) {
  return {
    eventStatus: 'idle',
    simulationMode: false,
    demoActive: false,
    stage: 'Quarter Final',
    round: 1,
    roundLabel: 'Round 1 — Antakshari Chain',
    question: {
      prompt: 'Name a Bollywood song that begins with the letter…',
      letter: 'M',
      hiddenAnswer: 'Mere Sapno Ki Rani — Aradhana (1969)',
      answerRevealed: false,
    },
    buzzer: {
      status: 'idle',
      announcement: null,
      teamId: null,
      teamName: null,
    },
    teams: SAMPLE_TEAMS.map((team, index) => normalizeTeam(team, index)),
    roundLibrary: normalizeRoundLibrary(null, EXAMPLE_ROUND_TEMPLATES),
    selectedRoundId: null,
    mediaLibrary: [],
    mediaPlayback: normalizeMediaPlayback(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

export const INITIAL_GAME_STATE = createInitialGameState()

/**
 * Merge persisted or partial sync payloads with defaults so nested slices never go missing.
 * @param {object | null | undefined} raw
 */
export function normalizeGameState(raw) {
  const base = createInitialGameState()
  if (!raw || typeof raw !== 'object') {
    return base
  }

  const hasRoundLibrary = Object.prototype.hasOwnProperty.call(raw, 'roundLibrary')
  const roundLibrary = hasRoundLibrary
    ? normalizeRoundLibrary(raw.roundLibrary, [])
    : normalizeRoundLibrary(null, EXAMPLE_ROUND_TEMPLATES)

  let selectedRoundId =
    typeof raw.selectedRoundId === 'string' ? raw.selectedRoundId : null
  if (selectedRoundId && !roundLibrary.some((r) => r.id === selectedRoundId)) {
    selectedRoundId = null
  }

  return {
    ...base,
    ...raw,
    question: { ...base.question, ...(raw.question ?? {}) },
    buzzer: { ...base.buzzer, ...(raw.buzzer ?? {}) },
    teams: normalizeTeamsList(raw.teams, base.teams),
    roundLibrary,
    selectedRoundId,
    mediaLibrary: normalizeMediaLibrary(raw.mediaLibrary),
    mediaPlayback: normalizeMediaPlayback(raw.mediaPlayback),
    updatedAt: raw.updatedAt ?? Date.now(),
  }
}

export { SAMPLE_TEAMS }

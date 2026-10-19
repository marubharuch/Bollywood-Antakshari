/** @typedef {'idle' | 'demo' | 'live' | 'paused'} EventStatus */
/** @typedef {'idle' | 'ready' | 'active' | 'locked'} BuzzerStatus */

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
    teams: [
      { id: 'team-1', name: 'Team Rang De', score: 120, accent: '#e11d48' },
      { id: 'team-2', name: 'Team Dil Se', score: 95, accent: '#7c3aed' },
      { id: 'team-3', name: 'Team Taal', score: 110, accent: '#0891b2' },
      { id: 'team-4', name: 'Team Josh', score: 80, accent: '#ea580c' },
    ],
    musicPlayer: {
      status: 'placeholder',
      label: 'Music player — Phase 2',
      trackName: null,
    },
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

  return {
    ...base,
    ...raw,
    question: { ...base.question, ...(raw.question ?? {}) },
    buzzer: { ...base.buzzer, ...(raw.buzzer ?? {}) },
    musicPlayer: { ...base.musicPlayer, ...(raw.musicPlayer ?? {}) },
    teams:
      Array.isArray(raw.teams) && raw.teams.length > 0 ? raw.teams : base.teams,
    updatedAt: raw.updatedAt ?? Date.now(),
  }
}

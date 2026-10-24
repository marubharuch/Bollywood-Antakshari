export const DEFAULT_BUZZER_SYSTEM = {
  enabled: false,
  serverUrl:
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUZZER_SERVER_URL
      ? import.meta.env.VITE_BUZZER_SERVER_URL
      : 'http://localhost:3847',
  simulationClients: false,
  showQrOnProjector: false,
}

export function normalizeBuzzerSystem(raw) {
  const base = { ...DEFAULT_BUZZER_SYSTEM }
  if (!raw || typeof raw !== 'object') return base
  return {
    enabled: Boolean(raw.enabled),
    serverUrl:
      typeof raw.serverUrl === 'string' && raw.serverUrl.trim()
        ? raw.serverUrl.trim().replace(/\/$/, '')
        : base.serverUrl,
    simulationClients: Boolean(raw.simulationClients),
    showQrOnProjector: Boolean(raw.showQrOnProjector),
  }
}

export function normalizeBuzzer(raw) {
  const base = {
    status: 'idle',
    announcement: null,
    teamId: null,
    teamName: null,
    questionId: null,
    source: 'manual',
  }
  if (!raw || typeof raw !== 'object') return base
  const status = ['idle', 'ready', 'active', 'locked'].includes(raw.status)
    ? raw.status
    : base.status
  return {
    ...base,
    ...raw,
    status,
    source: raw.source === 'server' || raw.source === 'demo' ? raw.source : 'manual',
  }
}

/**
 * Mobile buzzer URL. Optional tournament query params are for display/labeling only;
 * the buzzer server uses one shared room per process (no per-tournament socket rooms).
 */
export function buildMobileBuzzerUrl(serverUrl, options = {}) {
  const base = `${window.location.origin}${window.location.pathname}`
  const params = new URLSearchParams({ server: serverUrl })
  if (options.tournamentId) params.set('tournamentId', options.tournamentId)
  if (options.tournamentName) params.set('tournament', options.tournamentName)
  return `${base}#/buzzer-mobile?${params.toString()}`
}

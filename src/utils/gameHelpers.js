/**
 * @param {{ id: string, score: number }[]} teams
 * @returns {Set<string>}
 */
export function getLeadingTeamIds(teams) {
  if (!teams?.length) return new Set()
  const max = Math.max(...teams.map((t) => t.score))
  return new Set(teams.filter((t) => t.score === max).map((t) => t.id))
}

export function eventStatusLabel(status) {
  const map = {
    idle: 'Idle',
    demo: 'Demo Live',
    live: 'Live',
    paused: 'Paused',
  }
  return map[status] ?? status
}

export function eventStatusTone(status) {
  if (status === 'demo') return 'demo'
  if (status === 'live') return 'live'
  if (status === 'paused') return 'paused'
  return 'idle'
}

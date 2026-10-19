/**
 * @param {string} name
 * @param {{ id: string, name: string }[]} teams
 * @param {string | null} excludeTeamId
 */
export function validateTeamName(name, teams, excludeTeamId = null) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) {
    return { valid: false, error: 'Team name cannot be empty.' }
  }

  const normalized = trimmed.toLowerCase()
  const duplicate = (teams ?? []).some(
    (team) =>
      team.id !== excludeTeamId &&
      (team.name ?? '').trim().toLowerCase() === normalized,
  )

  if (duplicate) {
    return { valid: false, error: 'A team with this name already exists.' }
  }

  return { valid: true, name: trimmed }
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function validateTeamColor(color) {
  if (!color || typeof color !== 'string') {
    return { valid: false, error: 'Choose a display color.' }
  }
  const value = color.trim()
  if (!HEX_COLOR.test(value)) {
    return { valid: false, error: 'Color must be a hex value (e.g. #e11d48).' }
  }
  return { valid: true, color: value }
}

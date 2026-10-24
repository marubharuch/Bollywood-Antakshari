export const STAGE_PROFILE_ID = {
  QUARTER_FINAL: 'quarter_final',
  SEMI_FINAL: 'semi_final',
  GRAND_FINALE: 'grand_finale',
}

/** @typedef {'not_configured' | 'ready' | 'in_progress' | 'completed'} TournamentInstanceDisplayStatus */

export const TOURNAMENT_INSTANCE_DEFS = [
  {
    id: 'ti-quarter-final-1',
    name: 'Quarter Final 1',
    shortLabel: 'QF1',
    stageProfileId: STAGE_PROFILE_ID.QUARTER_FINAL,
    stageLabel: 'Quarter Final',
  },
  {
    id: 'ti-quarter-final-2',
    name: 'Quarter Final 2',
    shortLabel: 'QF2',
    stageProfileId: STAGE_PROFILE_ID.QUARTER_FINAL,
    stageLabel: 'Quarter Final',
  },
  {
    id: 'ti-quarter-final-3',
    name: 'Quarter Final 3',
    shortLabel: 'QF3',
    stageProfileId: STAGE_PROFILE_ID.QUARTER_FINAL,
    stageLabel: 'Quarter Final',
  },
  {
    id: 'ti-quarter-final-4',
    name: 'Quarter Final 4',
    shortLabel: 'QF4',
    stageProfileId: STAGE_PROFILE_ID.QUARTER_FINAL,
    stageLabel: 'Quarter Final',
  },
  {
    id: 'ti-semi-final-1',
    name: 'Semi Final 1',
    shortLabel: 'SF1',
    stageProfileId: STAGE_PROFILE_ID.SEMI_FINAL,
    stageLabel: 'Semi Final',
  },
  {
    id: 'ti-semi-final-2',
    name: 'Semi Final 2',
    shortLabel: 'SF2',
    stageProfileId: STAGE_PROFILE_ID.SEMI_FINAL,
    stageLabel: 'Semi Final',
  },
  {
    id: 'ti-grand-finale',
    name: 'Grand Finale',
    shortLabel: 'GF',
    stageProfileId: STAGE_PROFILE_ID.GRAND_FINALE,
    stageLabel: 'Grand Finale',
  },
]

export const STAGE_PROFILE_DEFS = [
  {
    id: STAGE_PROFILE_ID.QUARTER_FINAL,
    name: 'Quarter Final Configuration',
    description: 'Shared by Quarter Final 1–4',
  },
  {
    id: STAGE_PROFILE_ID.SEMI_FINAL,
    name: 'Semi Final Configuration',
    description: 'Shared by Semi Final 1–2',
  },
  {
    id: STAGE_PROFILE_ID.GRAND_FINALE,
    name: 'Grand Finale Configuration',
    description: 'Used only by the Grand Finale',
  },
]

export function getTournamentInstanceDef(instanceId) {
  return TOURNAMENT_INSTANCE_DEFS.find((d) => d.id === instanceId) ?? null
}

export function listInstancesForStageProfile(stageProfileId) {
  return TOURNAMENT_INSTANCE_DEFS.filter((d) => d.stageProfileId === stageProfileId)
}

export function matchLegacyTournamentToInstanceId(tournament) {
  if (!tournament) return null
  const id = typeof tournament.id === 'string' ? tournament.id.trim() : ''
  const byId = TOURNAMENT_INSTANCE_DEFS.find((d) => d.id === id)
  if (byId) return byId.id
  const name = (tournament.name ?? '').trim().toLowerCase()
  const byName = TOURNAMENT_INSTANCE_DEFS.find(
    (d) => d.name.toLowerCase() === name || d.shortLabel.toLowerCase() === name,
  )
  return byName?.id ?? null
}

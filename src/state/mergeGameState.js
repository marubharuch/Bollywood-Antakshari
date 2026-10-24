import { normalizeGameState } from './initialGameState.js'
import { normalizeMediaLibrary, normalizeMediaPlayback } from '../features/media/mediaModel.js'
import { normalizeRoundLibrary } from '../features/rounds/roundModel.js'
import { applyHindiWordLibraryToRoundLibrary } from '../features/rounds/hindiWordLibraryInstall.js'
import { applyQuestionBankRoundsToRoundLibrary } from '../features/questionBank/questionBankRoundInstall.js'
import {
  normalizeBuzzer,
  normalizeBuzzerSystem,
} from '../features/buzzer/buzzerModel.js'
import {
  normalizePlaySession,
  normalizePlayTimer,
  normalizeTournament,
  normalizeTournamentPlans,
} from '../features/tournament/tournamentModel.js'
import { normalizePresentation } from '../features/presentation/introModel.js'
import { normalizeScoreDisplay } from '../features/presentation/scoreDisplayModel.js'
import {
  isScoreAnnouncementActive,
  normalizeScoreAnnouncement,
} from '../features/presentation/scoreAnnouncementModel.js'
import { normalizeScorePresentation } from '../features/presentation/scorePresentationModel.js'
import { normalizeTeamsList } from '../features/tournament/teamModel.js'
import { normalizeStageProfiles } from '../features/tournament/stageProfileModel.js'
import { normalizeTournamentInstances } from '../features/tournament/tournamentInstanceModel.js'
import { migrateGameStateToMultiTournament } from '../features/tournament/tournamentStateMigration.js'
import { normalizeTournamentEventSettings } from '../features/tournament/tournamentEventModel.js'

/**
 * Merge remote/persisted payload into the current in-memory state without
 * dropping slices that are missing from a partial payload.
 * @param {object} current
 * @param {object | null | undefined} incoming
 */
export function mergeRemoteGameState(current, incoming) {
  if (!incoming || typeof incoming !== 'object') {
    return normalizeGameState(current)
  }

  const merged = {
    ...current,
    ...incoming,
    question: { ...(current.question ?? {}), ...(incoming.question ?? {}) },
    buzzer: normalizeBuzzer({
      ...(current.buzzer ?? {}),
      ...(incoming.buzzer ?? {}),
    }),
    buzzerSystem: Object.prototype.hasOwnProperty.call(incoming, 'buzzerSystem')
      ? normalizeBuzzerSystem({
          ...(current.buzzerSystem ?? {}),
          ...(incoming.buzzerSystem ?? {}),
        })
      : current.buzzerSystem,
    tournament: Object.prototype.hasOwnProperty.call(incoming, 'tournament')
      ? normalizeTournament({ ...(current.tournament ?? {}), ...(incoming.tournament ?? {}) })
      : current.tournament,
    tournamentPlans: Object.prototype.hasOwnProperty.call(incoming, 'tournamentPlans')
      ? normalizeTournamentPlans(incoming.tournamentPlans)
      : current.tournamentPlans,
    playSession: Object.prototype.hasOwnProperty.call(incoming, 'playSession')
      ? normalizePlaySession({ ...(current.playSession ?? {}), ...(incoming.playSession ?? {}) })
      : current.playSession,
    playTimer: Object.prototype.hasOwnProperty.call(incoming, 'playTimer')
      ? normalizePlayTimer({ ...(current.playTimer ?? {}), ...(incoming.playTimer ?? {}) })
      : current.playTimer,
    presentation: Object.prototype.hasOwnProperty.call(incoming, 'presentation')
      ? normalizePresentation({
          ...(current.presentation ?? {}),
          ...(incoming.presentation ?? {}),
        })
      : current.presentation,
    scoreDisplay: Object.prototype.hasOwnProperty.call(incoming, 'scoreDisplay')
      ? normalizeScoreDisplay({
          ...(current.scoreDisplay ?? {}),
          ...(incoming.scoreDisplay ?? {}),
        })
      : current.scoreDisplay,
    scoreAnnouncement: Object.prototype.hasOwnProperty.call(incoming, 'scoreAnnouncement')
      ? (() => {
          const ann = normalizeScoreAnnouncement(incoming.scoreAnnouncement)
          return isScoreAnnouncementActive(ann) ? ann : null
        })()
      : current.scoreAnnouncement,
    scorePresentation: Object.prototype.hasOwnProperty.call(incoming, 'scorePresentation')
      ? normalizeScorePresentation({
          ...(current.scorePresentation ?? {}),
          ...(incoming.scorePresentation ?? {}),
        })
      : current.scorePresentation,
    mediaPlayback: {
      ...normalizeMediaPlayback(current.mediaPlayback),
      ...(incoming.mediaPlayback ?? {}),
    },
    teams: Array.isArray(incoming.teams)
      ? normalizeTeamsList(incoming.teams, current.teams)
      : current.teams,
    mediaLibrary: Array.isArray(incoming.mediaLibrary)
      ? normalizeMediaLibrary(incoming.mediaLibrary)
      : current.mediaLibrary,
    roundLibrary: (() => {
      const base = Object.prototype.hasOwnProperty.call(incoming, 'roundLibrary')
        ? normalizeRoundLibrary(incoming.roundLibrary, current.roundLibrary ?? [])
        : current.roundLibrary
      const withHindi = applyHindiWordLibraryToRoundLibrary(base).roundLibrary
      return applyQuestionBankRoundsToRoundLibrary(withHindi).roundLibrary
    })(),
    selectedRoundId:
      typeof incoming.selectedRoundId === 'string'
        ? incoming.selectedRoundId
        : current.selectedRoundId,
    stageProfiles: Object.prototype.hasOwnProperty.call(incoming, 'stageProfiles')
      ? normalizeStageProfiles(incoming.stageProfiles)
      : current.stageProfiles,
    tournamentInstances: Object.prototype.hasOwnProperty.call(incoming, 'tournamentInstances')
      ? normalizeTournamentInstances(incoming.tournamentInstances)
      : current.tournamentInstances,
    activeTournamentInstanceId:
      typeof incoming.activeTournamentInstanceId === 'string'
        ? incoming.activeTournamentInstanceId
        : current.activeTournamentInstanceId,
    tournamentEventSettings: Object.prototype.hasOwnProperty.call(
      incoming,
      'tournamentEventSettings',
    )
      ? normalizeTournamentEventSettings(incoming.tournamentEventSettings)
      : current.tournamentEventSettings,
    updatedAt: incoming.updatedAt ?? current.updatedAt ?? Date.now(),
  }

  return migrateGameStateToMultiTournament(normalizeGameState(merged))
}

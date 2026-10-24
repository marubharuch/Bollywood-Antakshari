import { MAIN_ROUND_TYPE } from '../rounds/mainRoundType.js'
import { QUESTION_FORMAT } from '../questionLibrary/questionFormatModel.js'
import { normalizeRound } from '../rounds/roundModel.js'
import { QUESTION_BANK_ID, QUESTION_BANK_ROUND_IDS } from './questionBankIds.js'
import { hydrateRoundLibraryQuestionBanks } from './questionBankRound.js'

const BANK_ROUND_DEFS = [
  {
    id: QUESTION_BANK_ROUND_IDS.WORD_IN_MUKHADA,
    name: 'Word-in-Mukhada Round',
    description:
      'Teams name old (pre-2000) and new (post-2020) songs where the Hindi word appears in the mukhda, not as the first word.',
    instructions:
      'Show the Hindi word. Accept songs from the question bank references or equivalent valid answers.',
    questionBankId: QUESTION_BANK_ID.MUKHADA_WORD_32,
  },
  {
    id: QUESTION_BANK_ROUND_IDS.GAIT_GATA_CHAL_DOUBLE,
    name: 'Gait Gata Chal Double Round',
    description: 'Double-score variant using the same mukhda word bank.',
    instructions: 'Same word rules as Word-in-Mukhada; award double points per house rules.',
    questionBankId: QUESTION_BANK_ID.MUKHADA_WORD_32,
    scoring: { correctPoints: 20, wrongPenalty: 5, passPoints: 0 },
  },
]

/**
 * Ensure bank-linked round templates exist in the library (does not overwrite custom edits).
 * @param {object[]} roundLibrary
 */
export function applyQuestionBankRoundsToRoundLibrary(roundLibrary) {
  const list = Array.isArray(roundLibrary) ? [...roundLibrary] : []
  let changed = false

  for (const def of BANK_ROUND_DEFS) {
    const idx = list.findIndex((r) => r?.id === def.id)
    const existing = idx >= 0 ? normalizeRound(list[idx]) : null
    const round = normalizeRound({
      ...(existing ?? {}),
      id: def.id,
      name: existing?.name?.trim() ? existing.name : def.name,
      description: existing?.description?.trim() ? existing.description : def.description,
      instructions: existing?.instructions?.trim() ? existing.instructions : def.instructions,
      category: 'antakshari',
      mainRoundType: MAIN_ROUND_TYPE.WORD,
      questionFormat: QUESTION_FORMAT.WORD_IN_MUKHADA,
      questionBankId: def.questionBankId,
      questions: existing?.questions?.length ? existing.questions : [],
      customRule:
        existing?.customRule?.trim() ||
        'Target word appears in the mukhda but NOT as the first word. Old song pre-2000; new song post-2020.',
      scoring: existing?.scoring ?? def.scoring ?? { correctPoints: 10, wrongPenalty: 5, passPoints: 0 },
      timing: existing?.timing ?? { useTimer: true, timeLimitSeconds: 45 },
      rules: existing?.rules ?? {
        buzzerEnabled: false,
        mediaRequired: false,
        questionCount: 10,
        maxAttemptsPerTeam: 1,
      },
      active: existing?.active !== false,
      isTemplate: false,
    })

    if (idx >= 0) {
      if (JSON.stringify(list[idx]) !== JSON.stringify(round)) {
        list[idx] = round
        changed = true
      }
    } else {
      list.push(round)
      changed = true
    }
  }

  const hydrated = hydrateRoundLibraryQuestionBanks(list)
  return {
    roundLibrary: hydrated.roundLibrary,
    changed: changed || hydrated.changed,
  }
}

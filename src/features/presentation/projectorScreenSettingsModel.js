export const PROJECTOR_SETTINGS_STORAGE_KEY = 'bollywood-antakshari:projector-screen-settings-v1'

export const PROJECTOR_DISPLAY_SETUP = {
  EXTENDED: 'extended',
}

export const PROJECTOR_SCREEN_FIT = {
  AUTO: 'auto',
  HD: 'hd',
  FULL_HD: 'full_hd',
}

export const PROJECTOR_TEXT_SIZE = {
  MEDIUM: 'medium',
  LARGE: 'large',
  EXTRA_LARGE: 'extra_large',
}

export const PROJECTOR_LAYOUT_DENSITY = {
  COMPACT: 'compact',
  BALANCED: 'balanced',
  SPACIOUS: 'spacious',
}

export const PROJECTOR_SAFE_MARGIN = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
}

export const PROJECTOR_SCORE_COLUMNS = {
  AUTO: 'auto',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
}

/** @typedef {typeof DEFAULT_PROJECTOR_SCREEN_SETTINGS} ProjectorScreenSettings */

export const DEFAULT_PROJECTOR_SCREEN_SETTINGS = {
  displaySetup: PROJECTOR_DISPLAY_SETUP.EXTENDED,
  screenFit: PROJECTOR_SCREEN_FIT.AUTO,
  textSize: PROJECTOR_TEXT_SIZE.LARGE,
  layoutDensity: PROJECTOR_LAYOUT_DENSITY.BALANCED,
  safeMargin: PROJECTOR_SAFE_MARGIN.MEDIUM,
  scoreColumns: PROJECTOR_SCORE_COLUMNS.AUTO,
  highContrast: false,
  showTimer: true,
  showRoundTitle: true,
  showQuestionNumber: true,
}

const ENUMS = {
  displaySetup: Object.values(PROJECTOR_DISPLAY_SETUP),
  screenFit: Object.values(PROJECTOR_SCREEN_FIT),
  textSize: Object.values(PROJECTOR_TEXT_SIZE),
  layoutDensity: Object.values(PROJECTOR_LAYOUT_DENSITY),
  safeMargin: Object.values(PROJECTOR_SAFE_MARGIN),
  scoreColumns: Object.values(PROJECTOR_SCORE_COLUMNS),
}

function pickEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

/**
 * @param {unknown} raw
 * @returns {ProjectorScreenSettings}
 */
export function normalizeProjectorScreenSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PROJECTOR_SCREEN_SETTINGS }
  }
  const o = raw
  return {
    displaySetup: pickEnum(
      o.displaySetup,
      ENUMS.displaySetup,
      DEFAULT_PROJECTOR_SCREEN_SETTINGS.displaySetup,
    ),
    screenFit: pickEnum(o.screenFit, ENUMS.screenFit, DEFAULT_PROJECTOR_SCREEN_SETTINGS.screenFit),
    textSize: pickEnum(o.textSize, ENUMS.textSize, DEFAULT_PROJECTOR_SCREEN_SETTINGS.textSize),
    layoutDensity: pickEnum(
      o.layoutDensity,
      ENUMS.layoutDensity,
      DEFAULT_PROJECTOR_SCREEN_SETTINGS.layoutDensity,
    ),
    safeMargin: pickEnum(
      o.safeMargin,
      ENUMS.safeMargin,
      DEFAULT_PROJECTOR_SCREEN_SETTINGS.safeMargin,
    ),
    scoreColumns: pickEnum(
      o.scoreColumns,
      ENUMS.scoreColumns,
      DEFAULT_PROJECTOR_SCREEN_SETTINGS.scoreColumns,
    ),
    highContrast: typeof o.highContrast === 'boolean'
      ? o.highContrast
      : DEFAULT_PROJECTOR_SCREEN_SETTINGS.highContrast,
    showTimer: typeof o.showTimer === 'boolean'
      ? o.showTimer
      : DEFAULT_PROJECTOR_SCREEN_SETTINGS.showTimer,
    showRoundTitle: typeof o.showRoundTitle === 'boolean'
      ? o.showRoundTitle
      : DEFAULT_PROJECTOR_SCREEN_SETTINGS.showRoundTitle,
    showQuestionNumber: typeof o.showQuestionNumber === 'boolean'
      ? o.showQuestionNumber
      : DEFAULT_PROJECTOR_SCREEN_SETTINGS.showQuestionNumber,
  }
}

export const SCREEN_FIT_REFERENCE = {
  [PROJECTOR_SCREEN_FIT.HD]: { width: 1280, height: 720 },
  [PROJECTOR_SCREEN_FIT.FULL_HD]: { width: 1920, height: 1080 },
}

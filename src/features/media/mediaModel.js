export const MEDIA_CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'mukhda', label: 'Mukhda / Audio clip' },
  { id: 'antakshari', label: 'Antakshari' },
  { id: 'visual', label: 'Visual round' },
  { id: 'quiz', label: 'Quiz' },
]

export function createMediaId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `media-${crypto.randomUUID()}`
  }
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function detectMediaType(file) {
  const mime = file?.type ?? ''
  const name = file?.name ?? ''
  if (mime.startsWith('video/') || /\.mp4$/i.test(name)) {
    return 'video'
  }
  if (mime.startsWith('audio/') || /\.mp3$/i.test(name)) {
    return 'audio'
  }
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name)) {
    return 'image'
  }
  if (mime.startsWith('text/') || /\.(txt|md)$/i.test(name)) {
    return 'text'
  }
  return 'audio'
}

export function defaultDisplayTitle(fileName) {
  return (fileName ?? 'Untitled')
    .replace(/\.(mp3|mp4)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
}

/**
 * @param {object} raw
 */
export function normalizeMediaItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id =
    typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createMediaId()
  return {
    id,
    displayTitle:
      typeof raw.displayTitle === 'string' && raw.displayTitle.trim()
        ? raw.displayTitle.trim()
        : defaultDisplayTitle(raw.originalFileName),
    originalFileName:
      typeof raw.originalFileName === 'string' ? raw.originalFileName : 'file',
    mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : '',
    mediaType: ['video', 'audio', 'image', 'text'].includes(raw.mediaType)
      ? raw.mediaType
      : 'audio',
    sizeBytes:
      typeof raw.sizeBytes === 'number' && raw.sizeBytes >= 0 ? raw.sizeBytes : 0,
    category:
      typeof raw.category === 'string' && raw.category.trim()
        ? raw.category.trim()
        : 'general',
    assignedRoundId:
      typeof raw.assignedRoundId === 'string' ? raw.assignedRoundId : null,
    offlineReady: Boolean(raw.offlineReady),
    source: raw.source === 'external' ? 'external' : 'import',
    externalUrl:
      typeof raw.externalUrl === 'string' && raw.externalUrl.trim()
        ? raw.externalUrl.trim()
        : null,
    importError:
      typeof raw.importError === 'string' ? raw.importError : null,
    importedAt: typeof raw.importedAt === 'number' ? raw.importedAt : Date.now(),
  }
}

export function normalizeMediaLibrary(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => normalizeMediaItem(item)).filter(Boolean)
}

export const DEFAULT_MEDIA_PLAYBACK = {
  mediaId: null,
  status: 'idle',
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  playbackMode: 'audio',
  showVideoOnProjector: false,
  showVideoControls: false,
  hideTitleOnProjector: false,
  hideAnswerOnProjector: false,
  /** Projector video element muted (does not affect intro/buzzer). */
  videoMuted: false,
  videoAutoplaySoundBlocked: false,
  error: null,
  syncSeq: 0,
  segmentStart: null,
  segmentEnd: null,
}

export function normalizeMediaPlayback(raw) {
  const base = { ...DEFAULT_MEDIA_PLAYBACK }
  if (!raw || typeof raw !== 'object') return base
  return {
    ...base,
    ...raw,
    volume:
      typeof raw.volume === 'number'
        ? Math.min(1, Math.max(0, raw.volume))
        : base.volume,
    currentTime:
      typeof raw.currentTime === 'number' && raw.currentTime >= 0
        ? raw.currentTime
        : 0,
    duration:
      typeof raw.duration === 'number' && raw.duration >= 0 ? raw.duration : 0,
    status: ['idle', 'playing', 'paused', 'stopped', 'error'].includes(raw.status)
      ? raw.status
      : 'idle',
    playbackMode: raw.playbackMode === 'video' ? 'video' : 'audio',
    showVideoOnProjector:
      typeof raw.showVideoOnProjector === 'boolean'
        ? raw.showVideoOnProjector
        : raw.playbackMode === 'video',
    showVideoControls: Boolean(raw.showVideoControls),
    hideTitleOnProjector: Boolean(raw.hideTitleOnProjector),
    hideAnswerOnProjector: Boolean(raw.hideAnswerOnProjector),
    videoMuted: Boolean(raw.videoMuted),
    videoAutoplaySoundBlocked: Boolean(raw.videoAutoplaySoundBlocked),
    segmentStart:
      typeof raw.segmentStart === 'number' && raw.segmentStart >= 0 ? raw.segmentStart : null,
    segmentEnd:
      typeof raw.segmentEnd === 'number' && raw.segmentEnd >= 0 ? raw.segmentEnd : null,
  }
}

export function formatFileSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

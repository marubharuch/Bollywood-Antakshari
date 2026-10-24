import { getMediaBlob } from './mediaDb.js'
import { mediaDisplayDiag } from './mediaDisplayDiag.js'
import { revokeObjectUrl } from './objectUrl.js'

/** @type {Map<string, { url: string, sizeBytes: number }>} */
const urlByMediaId = new Map()

/**
 * @param {{ id: string, source?: string, externalUrl?: string, offlineReady?: boolean }} item
 */
export async function getCachedObjectUrlForItem(item) {
  if (!item) return { url: null, error: 'No media selected.' }
  if (item.source === 'external' && item.externalUrl) {
    return { url: item.externalUrl, cached: false }
  }
  if (!item.offlineReady) {
    return { url: null, error: 'File is not offline-ready.' }
  }

  const cached = urlByMediaId.get(item.id)
  if (cached?.url) {
    return { url: cached.url, cached: true }
  }

  const record = await getMediaBlob(item.id)
  if (!record?.blob) {
    mediaDisplayDiag('blob-missing', { mediaId: item.id })
    return { url: null, error: 'Media missing from browser storage.' }
  }

  mediaDisplayDiag('blob-loaded', {
    mediaId: item.id,
    sizeBytes: record.blob.size,
    mimeType: record.blob.type || record.mimeType || 'unknown',
  })

  const url = URL.createObjectURL(record.blob)
  urlByMediaId.set(item.id, { url, sizeBytes: record.blob.size })
  mediaDisplayDiag('object-url-created', { mediaId: item.id })
  return { url, cached: false }
}

export function releaseCachedObjectUrl(mediaId) {
  const entry = urlByMediaId.get(mediaId)
  if (!entry) return
  revokeObjectUrl(entry.url)
  urlByMediaId.delete(mediaId)
}

export function releaseAllCachedObjectUrls() {
  for (const [id] of urlByMediaId) {
    releaseCachedObjectUrl(id)
  }
}

import { deleteMediaBlob, putMediaBlob, verifyMediaBlob } from './mediaDb.js'
import {
  createMediaId,
  defaultDisplayTitle,
  detectMediaType,
  normalizeMediaItem,
} from './mediaModel.js'

function uniqueFileLabel(name, usedNames) {
  const lower = name.toLowerCase()
  if (!usedNames.has(lower)) {
    usedNames.add(lower)
    return name
  }
  let i = 2
  while (usedNames.has(`${lower} (${i})`)) i += 1
  const next = `${name} (${i})`
  usedNames.add(next.toLowerCase())
  return next
}

/**
 * @param {File} file
 * @param {{ existingItems: object[], onProgress?: (msg: string) => void }} options
 */
export async function importMediaFile(file, options = {}) {
  const existingItems = options.existingItems ?? []
  const usedNames = new Set(
    existingItems.map((m) => (m.originalFileName ?? '').toLowerCase()),
  )

  const isMp3 = /\.mp3$/i.test(file.name) || file.type === 'audio/mpeg'
  const isMp4 = /\.mp4$/i.test(file.name) || file.type === 'video/mp4'
  if (!isMp3 && !isMp4) {
    return {
      success: false,
      error: `${file.name}: only MP3 and MP4 files are supported.`,
    }
  }

  const id = createMediaId()
  const originalFileName = uniqueFileLabel(file.name, usedNames)
  const mediaType = detectMediaType(file)

  options.onProgress?.(`Storing ${originalFileName}…`)

  try {
    await putMediaBlob(id, {
      blob: file,
      mimeType: file.type || (mediaType === 'video' ? 'video/mp4' : 'audio/mpeg'),
      originalFileName,
      sizeBytes: file.size,
    })
  } catch (err) {
    return {
      success: false,
      error: `${originalFileName}: storage failed — ${err.message ?? err}`,
    }
  }

  let offlineReady = false
  let importError = null
  try {
    const verified = await verifyMediaBlob(id)
    if (!verified.ok) {
      importError = verified.error
      await deleteMediaBlob(id).catch(() => {})
    } else {
      offlineReady = true
    }
  } catch (err) {
    importError = err.message ?? 'Verification failed'
    await deleteMediaBlob(id).catch(() => {})
  }

  const item = normalizeMediaItem({
    id,
    displayTitle: defaultDisplayTitle(originalFileName),
    originalFileName,
    mimeType: file.type,
    mediaType,
    sizeBytes: file.size,
    offlineReady,
    importError,
    source: 'import',
    importedAt: Date.now(),
  })

  if (!offlineReady) {
    return {
      success: false,
      error: `${originalFileName}: ${importError ?? 'Not offline-ready'}`,
      item: null,
    }
  }

  return { success: true, item }
}

/**
 * @param {FileList | File[]} files
 */
export async function importMediaFiles(files, options = {}) {
  const list = Array.from(files ?? [])
  const results = []
  let library = [...(options.existingItems ?? [])]

  for (const file of list) {
    const result = await importMediaFile(file, {
      ...options,
      existingItems: library,
    })
    results.push({ file: file.name, ...result })
    if (result.success && result.item) {
      library = [...library, result.item]
    }
  }

  const imported = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)
  return { imported, failed, results, library }
}

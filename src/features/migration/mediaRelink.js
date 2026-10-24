import { getMediaBlob, putMediaBlob, verifyMediaBlob } from '../media/mediaDb.js'
import { detectMediaType, normalizeMediaItem } from '../media/mediaModel.js'

/**
 * @param {File[]} files
 */
export function buildMediaFileIndex(files) {
  /** @type {Map<string, File[]>} */
  const byBaseName = new Map()
  /** @type {Map<string, File[]>} */
  const byRelativePath = new Map()

  for (const file of files ?? []) {
    const name = file.name
    const base = name.toLowerCase()
    if (!byBaseName.has(base)) byBaseName.set(base, [])
    byBaseName.get(base).push(file)

    const rel = (file.webkitRelativePath || name).replace(/\\/g, '/').toLowerCase()
    if (!byRelativePath.has(rel)) byRelativePath.set(rel, [])
    byRelativePath.get(rel).push(file)
  }

  return { byBaseName, byRelativePath }
}

function pickUniqueFile(candidates, catalogItem) {
  if (!candidates?.length) return { file: null, issue: 'missing' }
  if (candidates.length > 1) {
    const sizeMatches = candidates.filter((f) => f.size === catalogItem.sizeBytes)
    if (sizeMatches.length === 1) {
      return { file: sizeMatches[0], issue: null }
    }
    return { file: null, issue: 'duplicate' }
  }
  const file = candidates[0]
  if (
    typeof catalogItem.sizeBytes === 'number' &&
    catalogItem.sizeBytes > 0 &&
    file.size !== catalogItem.sizeBytes
  ) {
    return { file, issue: 'size_mismatch' }
  }
  return { file, issue: null }
}

function findFileForCatalogItem(catalogItem, index) {
  if (catalogItem.source === 'external' && catalogItem.externalUrl) {
    return { file: null, issue: null, skip: true }
  }

  const fileName = catalogItem.originalFileName ?? ''
  const baseKey = fileName.toLowerCase()
  const relKey = fileName.replace(/\\/g, '/').toLowerCase()

  let candidates = index.byBaseName.get(baseKey) ?? []
  if (!candidates.length && fileName.includes('/')) {
    candidates = index.byRelativePath.get(relKey) ?? []
  }

  const { file, issue } = pickUniqueFile(candidates, catalogItem)
  return { file, issue, skip: false }
}

/**
 * Match catalog entries to files selected from disk (folder or multi-file).
 * Filename alone is not trusted when multiple same-name files exist without a unique size match.
 * @param {object[]} mediaCatalog
 * @param {File[]} files
 */
export function matchMediaCatalogToFiles(mediaCatalog, files) {
  const index = buildMediaFileIndex(files)
  const matched = []
  const missing = []
  const duplicate = []
  const sizeMismatch = []

  for (const entry of mediaCatalog ?? []) {
    const catalogItem = normalizeMediaItem(entry)
    if (!catalogItem) continue
    const { file, issue, skip } = findFileForCatalogItem(catalogItem, index)
    if (skip) {
      matched.push({ catalogItem, file: null, external: true })
      continue
    }
    if (issue === 'missing' || !file) {
      missing.push(catalogItem)
      continue
    }
    if (issue === 'duplicate') {
      duplicate.push(catalogItem)
      continue
    }
    if (issue === 'size_mismatch') {
      sizeMismatch.push({ catalogItem, file })
      continue
    }
    const detected = detectMediaType(file)
    if (detected !== catalogItem.mediaType && catalogItem.mediaType !== 'text') {
      sizeMismatch.push({
        catalogItem,
        file,
        reason: `Type mismatch (expected ${catalogItem.mediaType}, file looks like ${detected}).`,
      })
      continue
    }
    matched.push({ catalogItem, file })
  }

  return { matched, missing, duplicate, sizeMismatch }
}

/**
 * Store file in IndexedDB under the stable media id from the export catalog.
 * @param {File} file
 * @param {object} catalogItem
 */
export async function importMediaFileWithStableId(file, catalogItem) {
  const item = normalizeMediaItem(catalogItem)
  if (!item?.id) {
    return { success: false, error: 'Invalid catalog entry.' }
  }

  try {
    await putMediaBlob(item.id, {
      blob: file,
      mimeType: file.type || item.mimeType || 'application/octet-stream',
      originalFileName: item.originalFileName || file.name,
      sizeBytes: file.size,
    })
  } catch (err) {
    return {
      success: false,
      error: `${file.name}: storage failed — ${err?.message ?? err}`,
    }
  }

  const verified = await verifyMediaBlob(item.id)
  if (!verified.ok) {
    return {
      success: false,
      error: verified.error ?? 'Verification failed after import.',
    }
  }

  const libraryItem = normalizeMediaItem({
    ...item,
    offlineReady: true,
    importError: null,
    importedAt: Date.now(),
    sizeBytes: file.size,
    mimeType: file.type || item.mimeType,
  })

  return { success: true, item: libraryItem }
}

/**
 * @param {object[]} mediaLibrary
 */
export async function auditMediaLibraryOfflineStatus(mediaLibrary) {
  const ready = []
  const missing = []
  const external = []

  for (const raw of mediaLibrary ?? []) {
    const item = normalizeMediaItem(raw)
    if (!item) continue
    if (item.source === 'external' && item.externalUrl) {
      external.push(item)
      continue
    }
    if (!item.offlineReady) {
      missing.push(item)
      continue
    }
    const record = await getMediaBlob(item.id)
    if (!record?.blob) {
      missing.push(item)
    } else {
      ready.push(item)
    }
  }

  return { ready, missing, external }
}

/**
 * Read all files from a directory handle (File System Access API).
 * @param {FileSystemDirectoryHandle} dirHandle
 */
export async function readAllFilesFromDirectoryHandle(dirHandle) {
  const files = []
  async function walk(handle, prefix = '') {
    for await (const entry of handle.values()) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.kind === 'file') {
        const file = await entry.getFile()
        try {
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path,
            configurable: true,
          })
        } catch {
          // ignore
        }
        files.push(file)
      } else if (entry.kind === 'directory') {
        await walk(entry, path)
      }
    }
  }
  await walk(dirHandle)
  return files
}

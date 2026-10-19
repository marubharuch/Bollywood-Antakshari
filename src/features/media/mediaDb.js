const DB_NAME = 'bollywood-antakshari-media'
const DB_VERSION = 1
const STORE_NAME = 'files'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

/**
 * @param {string} id
 * @param {{ blob: Blob, mimeType: string, originalFileName: string, sizeBytes: number }} record
 */
export async function putMediaBlob(id, record) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record, id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
  })
}

/**
 * @param {string} id
 */
export async function getMediaBlob(id) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => {
      db.close()
      resolve(req.result ?? null)
    }
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'))
  })
}

/**
 * @param {string} id
 */
export async function deleteMediaBlob(id) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'))
  })
}

/**
 * Verify blob can be read back from IndexedDB.
 * @param {string} id
 */
export async function verifyMediaBlob(id) {
  const record = await getMediaBlob(id)
  if (!record?.blob || !(record.blob instanceof Blob)) {
    return { ok: false, error: 'Stored file could not be retrieved.' }
  }
  if (record.blob.size <= 0) {
    return { ok: false, error: 'Stored file is empty.' }
  }
  return { ok: true, record }
}

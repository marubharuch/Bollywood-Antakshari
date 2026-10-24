import { useEffect, useState } from 'react'
import { getMediaBlob } from '../../features/media/mediaDb.js'
import { getCachedObjectUrlForItem } from '../../features/media/mediaBlobUrlCache.js'
import { Button } from '../common/Button.jsx'

export function MediaPreviewModal({ item, onClose }) {
  const [textContent, setTextContent] = useState(null)
  const [objectUrl, setObjectUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!item) return undefined
    let cancelled = false

    async function load() {
      try {
        if (item.mediaType === 'text') {
          if (item.textContent) {
            setTextContent(item.textContent)
            return
          }
          const record = await getMediaBlob(item.id)
          if (cancelled || !record?.blob) return
          const text = await record.blob.text()
          if (!cancelled) setTextContent(text)
          return
        }
        if (item.mediaType === 'image' || item.mediaType === 'audio' || item.mediaType === 'video') {
          const { url, error: urlError } = await getCachedObjectUrlForItem(item)
          if (urlError && !cancelled) setError(urlError)
          if (!cancelled) setObjectUrl(url)
        }
      } catch (err) {
        if (!cancelled) setError(err?.message ?? 'Preview failed')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [item])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-slate-600 bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">{item.displayTitle}</h3>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
        <p className="mt-1 text-xs text-slate-500">{item.mediaType} · {item.mimeType}</p>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        {item.mediaType === 'image' && objectUrl && (
          <img src={objectUrl} alt="" className="mt-3 max-h-64 w-full rounded object-contain" />
        )}
        {item.mediaType === 'audio' && objectUrl && (
          <audio controls className="mt-3 w-full" src={objectUrl} />
        )}
        {item.mediaType === 'video' && objectUrl && (
          <video controls className="mt-3 max-h-64 w-full rounded" src={objectUrl} />
        )}
        {item.mediaType === 'text' && (
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-2 text-xs text-slate-200">
            {textContent ?? 'Loading…'}
          </pre>
        )}
      </div>
    </div>
  )
}

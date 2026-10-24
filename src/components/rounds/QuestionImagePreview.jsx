import { useEffect, useState } from 'react'
import { getCachedObjectUrlForItem } from '../../features/media/mediaBlobUrlCache.js'

export function QuestionImagePreview({ mediaItem }) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!mediaItem) {
      setUrl(null)
      return undefined
    }
    let cancelled = false
    getCachedObjectUrlForItem(mediaItem).then(({ url: u, error: e }) => {
      if (cancelled) return
      if (!u) setError(e ?? 'Could not load image.')
      else setUrl(u)
    })
    return () => {
      cancelled = true
    }
  }, [mediaItem?.id])

  if (!mediaItem) return null
  if (error) return <p className="text-[11px] text-red-300">{error}</p>
  if (!url) return <p className="text-[11px] text-slate-500">Loading preview…</p>
  return (
    <img
      src={url}
      alt=""
      className="mt-2 max-h-36 w-full rounded border border-slate-700 object-contain bg-slate-950"
    />
  )
}

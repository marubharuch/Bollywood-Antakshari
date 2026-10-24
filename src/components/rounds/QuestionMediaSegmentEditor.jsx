import { useCallback, useEffect, useRef, useState } from 'react'
import { getCachedObjectUrlForItem } from '../../features/media/mediaBlobUrlCache.js'
import { validateQuestionMediaSegment } from '../../features/rounds/roundQuestionModel.js'
import { formatMediaTime, parseMediaTimeInput } from '../../utils/mediaTime.js'
import { Button } from '../common/Button.jsx'

const inputClass =
  'mt-0.5 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white'

export function QuestionMediaSegmentEditor({
  mediaItem,
  mediaType,
  segmentStartSeconds,
  segmentEndSeconds,
  videoStartMuted = false,
  onSegmentChange,
  errorMessage,
}) {
  const mediaRef = useRef(null)
  const segmentStopRef = useRef(false)
  const [objectUrl, setObjectUrl] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [previewSegment, setPreviewSegment] = useState(false)

  const stopMediaElement = useCallback(() => {
    const el = mediaRef.current
    if (!el) return
    el.pause()
    el.removeAttribute('src')
    try {
      el.load()
    } catch {
      /* ignore */
    }
    setPlaying(false)
    setPreviewSegment(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    stopMediaElement()
    setObjectUrl(null)
    setLoadError(null)
    if (!mediaItem) return () => {
      cancelled = true
      stopMediaElement()
    }
    getCachedObjectUrlForItem(mediaItem).then(({ url, error }) => {
      if (cancelled) return
      if (!url) setLoadError(error ?? 'Could not load media.')
      else setObjectUrl(url)
    })
    return () => {
      cancelled = true
      stopMediaElement()
    }
  }, [mediaItem?.id, stopMediaElement])

  useEffect(() => {
    const el = mediaRef.current
    if (!el || !objectUrl) return
    if (el.src !== objectUrl) {
      el.src = objectUrl
      el.load()
    }
  }, [objectUrl])

  useEffect(() => {
    const el = mediaRef.current
    if (!el || mediaType !== 'video') return
    el.muted = Boolean(videoStartMuted)
  }, [videoStartMuted, mediaType, objectUrl])

  const onTimeUpdate = useCallback(() => {
    const el = mediaRef.current
    if (!el) return
    const t = el.currentTime
    setCurrentTime(t)
    if (previewSegment && segmentEndSeconds != null && t >= segmentEndSeconds - 0.05) {
      el.pause()
      el.currentTime = segmentEndSeconds
      setCurrentTime(segmentEndSeconds)
      setPlaying(false)
      setPreviewSegment(false)
      segmentStopRef.current = false
    }
  }, [previewSegment, segmentEndSeconds])

  const onLoadedMetadata = useCallback(() => {
    const el = mediaRef.current
    if (!el) return
    setDuration(Number.isFinite(el.duration) ? el.duration : 0)
  }, [])

  const applyPreviewMute = (el) => {
    if (mediaType === 'video') el.muted = Boolean(videoStartMuted)
  }

  const playFull = async () => {
    const el = mediaRef.current
    if (!el || loadError) return
    setPreviewSegment(false)
    applyPreviewMute(el)
    try {
      await el.play()
      setPlaying(true)
    } catch {
      if (mediaType === 'video' && !videoStartMuted) {
        el.muted = true
        try {
          await el.play()
          setPlaying(true)
          setLoadError('Playing muted — browser blocked sound. Enable Start with Mute off to test sound after a click.')
          return
        } catch {
          /* fall through */
        }
      }
      setLoadError('Playback blocked — press Play again.')
    }
  }

  const pause = () => {
    mediaRef.current?.pause()
    setPlaying(false)
    setPreviewSegment(false)
  }

  const restart = () => {
    const el = mediaRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
    setCurrentTime(0)
    setPlaying(false)
    setPreviewSegment(false)
  }

  const setStartFromPlayback = () => {
    const el = mediaRef.current
    if (!el) return
    onSegmentChange({
      segmentStartSeconds: el.currentTime,
      segmentEndSeconds,
    })
  }

  const setEndFromPlayback = () => {
    const el = mediaRef.current
    if (!el) return
    onSegmentChange({
      segmentStartSeconds,
      segmentEndSeconds: el.currentTime,
    })
  }

  const previewSelectedSegment = async () => {
    const el = mediaRef.current
    if (!el || segmentStartSeconds == null || segmentEndSeconds == null) return
    if (segmentEndSeconds <= segmentStartSeconds) return
    el.currentTime = segmentStartSeconds
    setCurrentTime(segmentStartSeconds)
    setPreviewSegment(true)
    segmentStopRef.current = true
    applyPreviewMute(el)
    try {
      await el.play()
      setPlaying(true)
    } catch {
      if (mediaType === 'video' && !videoStartMuted) {
        el.muted = true
        try {
          await el.play()
          setPlaying(true)
          setLoadError(
            'Preview playing muted — browser blocked sound. Uncheck Start with Mute and click Play to test sound.',
          )
          return
        } catch {
          /* fall through */
        }
      }
      setLoadError('Could not preview segment.')
    }
  }

  const restartSegment = () => {
    const el = mediaRef.current
    if (!el || segmentStartSeconds == null) return
    el.pause()
    el.currentTime = segmentStartSeconds
    setCurrentTime(segmentStartSeconds)
    setPlaying(false)
    setPreviewSegment(false)
  }

  const segmentValidation = validateQuestionMediaSegment(
    { segmentStartSeconds, segmentEndSeconds },
    duration,
  )

  const Tag = mediaType === 'video' ? 'video' : 'audio'

  return (
    <div className="mt-2 space-y-2 rounded border border-slate-600/80 bg-slate-950/60 p-2">
      {loadError && <p className="text-[11px] text-red-300">{loadError}</p>}
      {errorMessage && <p className="text-[11px] text-red-300">{errorMessage}</p>}
      {objectUrl && (
        <>
          <Tag
            ref={mediaRef}
            className={mediaType === 'video' ? 'max-h-40 w-full rounded bg-black' : 'w-full'}
            controls={false}
            preload="metadata"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            step={0.1}
            value={Math.min(currentTime, duration || currentTime)}
            className="w-full accent-rose-500"
            onChange={(e) => {
              const t = Number(e.target.value)
              if (mediaRef.current) mediaRef.current.currentTime = t
              setCurrentTime(t)
            }}
          />
          <p className="text-[10px] text-slate-400">
            {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
          </p>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="gold" onClick={playing ? pause : playFull}>
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button size="sm" variant="outline" onClick={pause}>Resume</Button>
            <Button size="sm" variant="ghost" onClick={restart}>Restart</Button>
          </div>
          <div className="flex flex-wrap gap-1 border-t border-slate-700 pt-2">
            <Button size="sm" variant="secondary" onClick={setStartFromPlayback}>
              Set Start Time
            </Button>
            <Button size="sm" variant="secondary" onClick={setEndFromPlayback}>
              Set End Time
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={segmentStartSeconds == null || segmentEndSeconds == null}
              onClick={previewSelectedSegment}
            >
              Preview Segment
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={segmentStartSeconds == null}
              onClick={restartSegment}
            >
              Restart Segment
            </Button>
          </div>
          <p className="text-[11px] text-amber-200/90">
            Segment: {formatMediaTime(segmentStartSeconds ?? 0)} →{' '}
            {segmentEndSeconds != null ? formatMediaTime(segmentEndSeconds) : '—'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-slate-500">
              Fine-tune start (m:ss)
              <input
                className={inputClass}
                value={segmentStartSeconds != null ? formatMediaTime(segmentStartSeconds) : ''}
                onChange={(e) => {
                  const parsed = parseMediaTimeInput(e.target.value)
                  if (parsed != null) onSegmentChange({ segmentStartSeconds: parsed, segmentEndSeconds })
                }}
              />
            </label>
            <label className="text-[10px] text-slate-500">
              Fine-tune end (m:ss)
              <input
                className={inputClass}
                value={segmentEndSeconds != null ? formatMediaTime(segmentEndSeconds) : ''}
                onChange={(e) => {
                  const parsed = parseMediaTimeInput(e.target.value)
                  if (parsed != null) onSegmentChange({ segmentStartSeconds, segmentEndSeconds: parsed })
                }}
              />
            </label>
          </div>
          {!segmentValidation.valid && segmentValidation.errors.length > 0 && (
            <ul className="list-disc pl-4 text-[10px] text-red-300">
              {segmentValidation.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { getCachedObjectUrlForItem } from '../features/media/mediaBlobUrlCache.js'

const TIMEUPDATE_THROTTLE_MS = 250

/**
 * @param {'control' | 'display'} role
 * - control: admin commands only (no local video decoder)
 * - display: single projector decoder + throttled time reporting
 */
export function useMediaPlaybackSync({
  item,
  playback,
  role,
  patchMediaPlayback,
}) {
  const mediaRef = useRef(null)
  const loadedMediaIdRef = useRef(null)
  const loadedUrlRef = useRef(null)
  const lastAppliedSeqRef = useRef(0)
  const lastStatusRef = useRef(playback?.status ?? 'idle')
  const lastTimePatchRef = useRef(0)
  const [loadError, setLoadError] = useState(null)
  const [needsProjectorGesture, setNeedsProjectorGesture] = useState(false)

  const isDisplay = role === 'display'
  const isControl = role === 'control'

  const loadIntoElement = useCallback(
    async (mediaItem) => {
      const el = mediaRef.current
      if (!el || !mediaItem) return false

      if (
        loadedMediaIdRef.current === mediaItem.id &&
        loadedUrlRef.current &&
        el.src === loadedUrlRef.current
      ) {
        return true
      }

      setLoadError(null)
      try {
        const { url, error } = await getCachedObjectUrlForItem(mediaItem)
        if (!url) {
          setLoadError(error ?? 'Cannot load media.')
          patchMediaPlayback(
            { status: 'error', error: error ?? 'Cannot load media.' },
            { command: true },
          )
          return false
        }
        if (el.src !== url) {
          el.src = url
          el.load()
        }
        loadedMediaIdRef.current = mediaItem.id
        loadedUrlRef.current = url
        return true
      } catch (err) {
        const message = err?.message ?? 'Failed to load media.'
        setLoadError(message)
        patchMediaPlayback({ status: 'error', error: message }, { command: true })
        return false
      }
    },
    [patchMediaPlayback],
  )

  useEffect(() => {
    if (!isDisplay || !item) return
    loadIntoElement(item)
  }, [isDisplay, item?.id, item?.externalUrl, loadIntoElement])

  useEffect(() => {
    const el = mediaRef.current
    if (!el || !isDisplay) return
    const vol = playback?.volume ?? 0.85
    if (Math.abs(el.volume - vol) > 0.01) {
      el.volume = vol
    }
  }, [isDisplay, playback?.volume])

  useEffect(() => {
    if (!isDisplay || !item) return

    const seq = playback?.syncSeq ?? 0
    const status = playback?.status ?? 'idle'
    const seqChanged = seq !== lastAppliedSeqRef.current
    const statusChanged = status !== lastStatusRef.current
    if (!seqChanged && !statusChanged) return

    const apply = async () => {
      await loadIntoElement(item)
      const target = mediaRef.current
      if (!target) return
      target.volume = playback.volume ?? 0.85

      if (status === 'playing') {
        const t = playback.currentTime ?? 0
        if (Math.abs(target.currentTime - t) > 0.35) {
          target.currentTime = t
        }
        try {
          await target.play()
          setNeedsProjectorGesture(false)
        } catch {
          setNeedsProjectorGesture(true)
          patchMediaPlayback(
            {
              status: 'paused',
              error:
                'Click Play once on the projector page (browser autoplay policy), then use admin controls.',
            },
            { command: true },
          )
        }
      } else if (status === 'paused') {
        target.pause()
        if (typeof playback.currentTime === 'number') {
          target.currentTime = playback.currentTime
        }
      } else if (status === 'stopped' || status === 'idle') {
        target.pause()
        target.currentTime = 0
      }

      lastAppliedSeqRef.current = seq
      lastStatusRef.current = status
    }

    apply()
  }, [
    isDisplay,
    item,
    playback?.status,
    playback?.syncSeq,
    playback?.volume,
    loadIntoElement,
    patchMediaPlayback,
  ])

  const onTimeUpdate = useCallback(() => {
    if (!isDisplay) return
    const el = mediaRef.current
    if (!el || playback?.status !== 'playing') return
    const now = Date.now()
    if (now - lastTimePatchRef.current < TIMEUPDATE_THROTTLE_MS) return
    lastTimePatchRef.current = now
    patchMediaPlayback({
      currentTime: el.currentTime,
      duration: Number.isFinite(el.duration) ? el.duration : playback?.duration ?? 0,
    })
  }, [isDisplay, patchMediaPlayback, playback?.duration, playback?.status])

  const onLoadedMetadata = useCallback(() => {
    if (!isDisplay) return
    const el = mediaRef.current
    if (!el) return
    patchMediaPlayback({ duration: el.duration || 0 })
  }, [isDisplay, patchMediaPlayback])

  const play = useCallback(async () => {
    if (!item) return { ok: false, error: 'Select media first.' }

    if (isControl) {
      patchMediaPlayback(
        {
          status: 'playing',
          error: null,
          mediaId: item.id,
          playbackMode:
            playback?.playbackMode === 'video' || item.mediaType === 'video'
              ? 'video'
              : 'audio',
          syncSeq: Date.now(),
        },
        { command: true },
      )
      return {
        ok: true,
        message:
          'Playback runs on the projector tab (single decoder). Open #/projector if needed.',
      }
    }

    const loaded = await loadIntoElement(item)
    if (!loaded) return { ok: false, error: loadError ?? 'Could not load media.' }
    try {
      await mediaRef.current?.play()
      patchMediaPlayback({ status: 'playing', error: null, syncSeq: Date.now() }, { command: true })
      return { ok: true }
    } catch {
      return {
        ok: false,
        error: 'Playback blocked. Click Play on the projector page once.',
      }
    }
  }, [item, isControl, patchMediaPlayback, playback?.playbackMode, loadIntoElement, loadError])

  const pause = useCallback(() => {
    const t = isDisplay
      ? mediaRef.current?.currentTime ?? playback?.currentTime ?? 0
      : playback?.currentTime ?? 0
    if (isDisplay) mediaRef.current?.pause()
    patchMediaPlayback(
      { status: 'paused', currentTime: t, syncSeq: Date.now() },
      { command: true },
    )
  }, [isDisplay, patchMediaPlayback, playback?.currentTime])

  const stop = useCallback(() => {
    if (isDisplay) {
      const el = mediaRef.current
      if (el) {
        el.pause()
        el.currentTime = 0
      }
    }
    patchMediaPlayback(
      { status: 'stopped', currentTime: 0, syncSeq: Date.now() },
      { command: true },
    )
  }, [isDisplay, patchMediaPlayback])

  const seek = useCallback(
    (time) => {
      if (isDisplay && mediaRef.current) {
        mediaRef.current.currentTime = time
      }
      patchMediaPlayback(
        { currentTime: time, syncSeq: Date.now() },
        { command: true },
      )
    },
    [isDisplay, patchMediaPlayback],
  )

  const setVolume = useCallback(
    (volume) => {
      const v = Math.min(1, Math.max(0, volume))
      if (isDisplay && mediaRef.current) {
        mediaRef.current.volume = v
      }
      patchMediaPlayback({ volume: v })
    },
    [isDisplay, patchMediaPlayback],
  )

  return {
    mediaRef,
    loadError,
    needsProjectorGesture,
    play,
    pause,
    stop,
    seek,
    setVolume,
    onTimeUpdate,
    onLoadedMetadata,
  }
}

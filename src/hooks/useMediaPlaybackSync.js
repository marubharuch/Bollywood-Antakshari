import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getCachedObjectUrlForItem } from '../features/media/mediaBlobUrlCache.js'
import { mediaDisplayDiag } from '../features/media/mediaDisplayDiag.js'

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
  const [displaySurface, setDisplaySurface] = useState({
    mediaId: null,
    ready: false,
    loading: false,
  })

  const loadGenerationRef = useRef(0)

  const isDisplay = role === 'display'
  const isControl = role === 'control'

  const markDisplayReady = useCallback((mediaId) => {
    if (!isDisplay || !mediaId) return
    setDisplaySurface({ mediaId, ready: true, loading: false })
    mediaDisplayDiag('element-ready', { mediaId })
  }, [isDisplay])

  const markDisplayError = useCallback(
    (mediaId, message) => {
      if (!isDisplay) return
      setLoadError(message)
      setDisplaySurface({ mediaId, ready: false, loading: false })
      patchMediaPlayback({ status: 'error', error: message }, { command: true })
      mediaDisplayDiag('element-error', { mediaId, message })
    },
    [isDisplay, patchMediaPlayback],
  )

  const waitForElementReady = useCallback((el, mediaId, generation) => {
    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
      if (loadGenerationRef.current === generation) {
        markDisplayReady(mediaId)
      }
      return
    }
    const onReady = () => {
      if (loadGenerationRef.current !== generation) return
      markDisplayReady(mediaId)
    }
    const onFail = () => {
      if (loadGenerationRef.current !== generation) return
      const code = el.error?.code
      const message =
        el.error?.message ||
        (code ? `Media error (code ${code}).` : 'Video failed to load or decode.')
      markDisplayError(mediaId, message)
    }
    el.addEventListener('loadedmetadata', onReady, { once: true })
    el.addEventListener('canplay', onReady, { once: true })
    el.addEventListener('error', onFail, { once: true })
    const timeoutId = window.setTimeout(() => {
      if (loadGenerationRef.current !== generation) return
      if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
        markDisplayReady(mediaId)
        return
      }
      markDisplayError(mediaId, 'Video load timed out. Check the file in Media Library.')
    }, 25000)
    const clearTimer = () => window.clearTimeout(timeoutId)
    el.addEventListener('loadedmetadata', clearTimer, { once: true })
    el.addEventListener('error', clearTimer, { once: true })
  }, [markDisplayError, markDisplayReady])

  const loadIntoElement = useCallback(
    async (mediaItem, generation) => {
      const el = mediaRef.current
      if (!mediaItem) return false
      if (!el) {
        mediaDisplayDiag('load-deferred-no-element', { mediaId: mediaItem.id })
        return false
      }

      if (
        loadedMediaIdRef.current === mediaItem.id &&
        loadedUrlRef.current &&
        el.src === loadedUrlRef.current
      ) {
        if (isDisplay && loadGenerationRef.current === generation) {
          waitForElementReady(el, mediaItem.id, generation)
        }
        return true
      }

      if (isDisplay && loadGenerationRef.current === generation) {
        setLoadError(null)
        setDisplaySurface({ mediaId: mediaItem.id, ready: false, loading: true })
      }

      try {
        mediaDisplayDiag('lookup-start', {
          mediaId: mediaItem.id,
          offlineReady: mediaItem.offlineReady,
          source: mediaItem.source,
        })
        const { url, error } = await getCachedObjectUrlForItem(mediaItem)
        if (loadGenerationRef.current !== generation) {
          mediaDisplayDiag('load-stale-after-url', { mediaId: mediaItem.id })
          return false
        }
        if (!url) {
          const msg = error ?? 'Cannot load media.'
          if (isDisplay) markDisplayError(mediaItem.id, msg)
          else {
            setLoadError(msg)
            patchMediaPlayback({ status: 'error', error: msg }, { command: true })
          }
          return false
        }
        if (el.src !== url) {
          el.src = url
          el.load()
          mediaDisplayDiag('element-src-set', { mediaId: mediaItem.id })
        }
        loadedMediaIdRef.current = mediaItem.id
        loadedUrlRef.current = url
        if (isDisplay) {
          waitForElementReady(el, mediaItem.id, generation)
        }
        return true
      } catch (err) {
        if (loadGenerationRef.current !== generation) return false
        const message = err?.message ?? 'Failed to load media.'
        if (isDisplay) markDisplayError(mediaItem.id, message)
        else {
          setLoadError(message)
          patchMediaPlayback({ status: 'error', error: message }, { command: true })
        }
        return false
      }
    },
    [isDisplay, markDisplayError, patchMediaPlayback, waitForElementReady],
  )

  useLayoutEffect(() => {
    if (!isDisplay || !item) return
    const generation = ++loadGenerationRef.current
    if (loadedMediaIdRef.current !== item.id) {
      lastAppliedSeqRef.current = 0
      setDisplaySurface({ mediaId: item.id, ready: false, loading: true })
      setLoadError(null)
    }

    let cancelled = false
    const run = async () => {
      const ok = await loadIntoElement(item, generation)
      if (cancelled || loadGenerationRef.current !== generation) return
      if (!ok && mediaRef.current) {
        await loadIntoElement(item, generation)
      } else if (!ok) {
        requestAnimationFrame(() => {
          if (!cancelled && loadGenerationRef.current === generation) {
            loadIntoElement(item, generation)
          }
        })
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isDisplay, item?.id, item?.externalUrl, item?.offlineReady, loadIntoElement])

  useEffect(() => {
    if (!isDisplay || !item) return
    const el = mediaRef.current
    if (!el) return
    const status = playback?.status ?? 'idle'
    if (status !== 'stopped' && status !== 'idle' && status !== 'paused') return
    const segStart =
      typeof playback?.segmentStart === 'number' ? playback.segmentStart : null
    const t =
      typeof playback?.currentTime === 'number'
        ? playback.currentTime
        : segStart ?? 0
    if (Number.isFinite(t) && Math.abs(el.currentTime - t) > 0.15) {
      el.currentTime = t
    }
  }, [
    isDisplay,
    item?.id,
    playback?.status,
    playback?.currentTime,
    playback?.segmentStart,
    playback?.mediaId,
  ])

  const applyElementVolumeAndMute = useCallback(
    (el, pb) => {
      if (!el) return
      const vol = pb?.volume ?? 0.85
      if (Math.abs(el.volume - vol) > 0.01) {
        el.volume = vol
      }
      if (item?.mediaType === 'video') {
        el.muted = Boolean(pb?.videoMuted)
      }
    },
    [item?.mediaType],
  )

  useEffect(() => {
    const el = mediaRef.current
    if (!el || !isDisplay) return
    applyElementVolumeAndMute(el, playback)
  }, [isDisplay, playback?.volume, playback?.videoMuted, applyElementVolumeAndMute, playback])

  useEffect(() => {
    if (!isDisplay || !item) return

    const seq = playback?.syncSeq ?? 0
    const status = playback?.status ?? 'idle'
    const seqChanged = seq !== lastAppliedSeqRef.current
    const statusChanged = status !== lastStatusRef.current
    const muteChanged =
      Boolean(playback?.videoMuted) !== Boolean(lastStatusRef.videoMuted)
    if (!seqChanged && !statusChanged && !muteChanged) return
    lastStatusRef.videoMuted = Boolean(playback?.videoMuted)

    const waitUntilCanPlay = (target) =>
      new Promise((resolve) => {
        if (target.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          resolve()
          return
        }
        const done = () => resolve()
        target.addEventListener('canplay', done, { once: true })
        target.addEventListener('loadeddata', done, { once: true })
        window.setTimeout(done, 8000)
      })

    const tryPlayWithPolicy = async (target, pb) => {
      applyElementVolumeAndMute(target, pb)
      const segStart =
        typeof pb.segmentStart === 'number' ? pb.segmentStart : null
      const t =
        segStart != null && (pb.currentTime ?? 0) < segStart - 0.01
          ? segStart
          : pb.currentTime ?? 0
      if (Math.abs(target.currentTime - t) > 0.35) {
        target.currentTime = t
      }
      const wantSound = item?.mediaType === 'video' && !pb.videoMuted
      try {
        await target.play()
        setNeedsProjectorGesture(false)
        if (wantSound && target.muted) {
          patchMediaPlayback(
            {
              videoAutoplaySoundBlocked: true,
              error: 'Video is playing muted until sound is enabled.',
            },
            { command: true },
          )
          setNeedsProjectorGesture(true)
        } else {
          patchMediaPlayback(
            { videoAutoplaySoundBlocked: false, error: null },
            { command: true },
          )
        }
        return true
      } catch {
        if (wantSound) {
          target.muted = true
          try {
            await target.play()
            patchMediaPlayback(
              {
                status: 'playing',
                videoAutoplaySoundBlocked: true,
                error: 'Browser blocked sound — video is playing muted. Enable sound on projector or host.',
              },
              { command: true },
            )
            setNeedsProjectorGesture(true)
            return true
          } catch {
            /* fall through */
          }
        }
        setNeedsProjectorGesture(true)
        patchMediaPlayback(
          {
            status: 'paused',
            error:
              'Playback blocked. Open the projector tab and tap Enable playback, or press Play on the host.',
          },
          { command: true },
        )
        return false
      }
    }

    const apply = async () => {
      await loadIntoElement(item, loadGenerationRef.current)
      const target = mediaRef.current
      if (!target) return
      applyElementVolumeAndMute(target, playback)

      if (status === 'playing') {
        await waitUntilCanPlay(target)
        await tryPlayWithPolicy(target, playback)
      } else if (status === 'paused') {
        target.pause()
        if (typeof playback.currentTime === 'number') {
          target.currentTime = playback.currentTime
        }
      } else if (status === 'stopped' || status === 'idle') {
        target.pause()
        const segStart =
          typeof playback.segmentStart === 'number' ? playback.segmentStart : null
        const t =
          typeof playback.currentTime === 'number'
            ? playback.currentTime
            : segStart ?? 0
        target.currentTime = t
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
    playback?.videoMuted,
    playback?.currentTime,
    playback?.segmentStart,
    applyElementVolumeAndMute,
    loadIntoElement,
    patchMediaPlayback,
  ])

  const onTimeUpdate = useCallback(() => {
    if (!isDisplay) return
    const el = mediaRef.current
    if (!el || playback?.status !== 'playing') return
    const segEnd =
      typeof playback?.segmentEnd === 'number' ? playback.segmentEnd : null
    if (segEnd != null && el.currentTime >= segEnd - 0.08) {
      el.pause()
      el.currentTime = segEnd
      patchMediaPlayback(
        {
          status: 'paused',
          currentTime: segEnd,
          syncSeq: Date.now(),
        },
        { command: true },
      )
      return
    }
    const now = Date.now()
    if (now - lastTimePatchRef.current < TIMEUPDATE_THROTTLE_MS) return
    lastTimePatchRef.current = now
    patchMediaPlayback({
      currentTime: el.currentTime,
      duration: Number.isFinite(el.duration) ? el.duration : playback?.duration ?? 0,
    })
  }, [
    isDisplay,
    patchMediaPlayback,
    playback?.duration,
    playback?.status,
    playback?.segmentEnd,
  ])

  const onLoadedMetadata = useCallback(() => {
    if (!isDisplay) return
    const el = mediaRef.current
    if (!el || !item?.id) return
    patchMediaPlayback({ duration: el.duration || 0 })
    markDisplayReady(item.id)
  }, [isDisplay, item?.id, markDisplayReady, patchMediaPlayback])

  const onCanPlay = useCallback(() => {
    if (!isDisplay || !item?.id) return
    markDisplayReady(item.id)
    const el = mediaRef.current
    if (el && playback?.status === 'playing' && el.paused) {
      applyElementVolumeAndMute(el, playback)
      el.play().catch(() => {
        setNeedsProjectorGesture(true)
      })
    }
  }, [isDisplay, item?.id, markDisplayReady, playback?.status, playback, applyElementVolumeAndMute])

  const onMediaError = useCallback(() => {
    if (!isDisplay || !item?.id) return
    const el = mediaRef.current
    const message =
      el?.error?.message || 'Video failed to load or decode on the projector.'
    markDisplayError(item.id, message)
  }, [isDisplay, item?.id, markDisplayError])

  const onEmptied = useCallback(() => {
    if (!isDisplay || !item?.id) return
    if (loadedMediaIdRef.current === item.id) {
      setDisplaySurface({ mediaId: item.id, ready: false, loading: true })
    }
  }, [isDisplay, item?.id])

  const play = useCallback(async () => {
    if (!item) return { ok: false, error: 'Select media first.' }

    if (isControl) {
      const segStart =
        typeof playback?.segmentStart === 'number' ? playback.segmentStart : null
      patchMediaPlayback(
        {
          status: 'playing',
          error: null,
          videoAutoplaySoundBlocked: false,
          mediaId: item.id,
          currentTime: segStart ?? playback?.currentTime ?? 0,
          playbackMode:
            playback?.playbackMode === 'video' || item.mediaType === 'video'
              ? 'video'
              : 'audio',
          showVideoOnProjector: item.mediaType === 'video' || item.mediaType === 'image',
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

    const loaded = await loadIntoElement(item, loadGenerationRef.current)
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
    const segStart =
      typeof playback?.segmentStart === 'number' ? playback.segmentStart : 0
    if (isDisplay) {
      const el = mediaRef.current
      if (el) {
        el.pause()
        el.currentTime = segStart
      }
    }
    patchMediaPlayback(
      { status: 'stopped', currentTime: segStart, syncSeq: Date.now() },
      { command: true },
    )
  }, [isDisplay, patchMediaPlayback, playback?.segmentStart])

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

  const mediaReady =
    isDisplay &&
    Boolean(item?.id) &&
    displaySurface.mediaId === item.id &&
    displaySurface.ready
  const mediaLoading =
    isDisplay &&
    Boolean(item?.id) &&
    displaySurface.mediaId === item.id &&
    displaySurface.loading &&
    !displaySurface.ready &&
    !loadError

  return {
    mediaRef,
    loadError,
    needsProjectorGesture,
    mediaReady,
    mediaLoading,
    play,
    pause,
    stop,
    seek,
    setVolume,
    onTimeUpdate,
    onLoadedMetadata,
    onCanPlay,
    onMediaError,
    onEmptied,
  }
}

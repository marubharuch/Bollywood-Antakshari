import { memo } from 'react'

export const MediaEngine = memo(function MediaEngine({
  mediaRef,
  item,
  onTimeUpdate,
  onLoadedMetadata,
  showVideo = false,
  className = '',
  controls = false,
}) {
  const useVideoTag = item?.mediaType === 'video'

  if (useVideoTag) {
    const hiddenAudioOnly = !showVideo
    return (
      <video
        ref={mediaRef}
        className={`${className} ${hiddenAudioOnly ? 'sr-only absolute h-px w-px opacity-0' : ''}`}
        playsInline
        preload="auto"
        controls={controls}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
      />
    )
  }

  return (
    <audio
      ref={mediaRef}
      className={className}
      preload="auto"
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={onLoadedMetadata}
    />
  )
})

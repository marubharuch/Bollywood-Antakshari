# Media library (Phase 4)

- **IndexedDB** (`mediaDb.js`): stores imported file blobs only.
- **localStorage sync** (`gameState.mediaLibrary`): metadata, assignments, playback state — no blobs.
- **offlineReady**: set only after `verifyMediaBlob` succeeds.
- **External URLs**: metadata + stream playback; not copied offline (CORS may block).

Keep original media files as backup; browser storage can be cleared or quota-limited.

## Playback performance (Phase 4)

- **One decoder**: only the projector tab mounts `<video>` / `<audio>` and decodes media.
- **Admin** sends transport commands via synced state (`syncSeq` on play/pause/seek/stop only).
- **Object URLs** are cached per `mediaId` in `mediaBlobUrlCache.js` (not recreated on each React update).
- MP4 files should use **H.264 + AAC**, ideally **720p**, for smooth laptop/projector playback. Re-encode a copy with ffmpeg; keep your original file unchanged:

```bash
ffmpeg -i "Original.mp4" -c:v libx264 -profile:v high -level 4.1 -vf scale=-2:720 -c:a aac -b:a 128k -movflags +faststart "Original-720p.mp4"
```

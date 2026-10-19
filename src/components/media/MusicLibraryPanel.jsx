import { useMemo, useRef, useState } from 'react'
import { releaseCachedObjectUrl } from '../../features/media/mediaBlobUrlCache.js'
import { deleteMediaBlob } from '../../features/media/mediaDb.js'
import { importMediaFiles } from '../../features/media/importMediaFiles.js'
import { formatFileSize, MEDIA_CATEGORIES } from '../../features/media/mediaModel.js'
import { Button } from '../common/Button.jsx'
import { Badge } from '../common/Badge.jsx'
import { InlineAlert } from '../common/InlineAlert.jsx'

export function MusicLibraryPanel({
  mediaLibrary,
  roundLibrary,
  onImportComplete,
  onUpdateMetadata,
  onDeleteMetadata,
  onSelectForPlayback,
  onAddExternalLink,
  onNotify,
}) {
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [externalTitle, setExternalTitle] = useState('')

  const filtered = useMemo(() => {
    let list = mediaLibrary ?? []
    if (typeFilter === 'audio') list = list.filter((m) => m.mediaType === 'audio')
    if (typeFilter === 'video') list = list.filter((m) => m.mediaType === 'video')
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (m) =>
          m.displayTitle.toLowerCase().includes(q) ||
          m.originalFileName.toLowerCase().includes(q),
      )
    }
    return list
  }, [mediaLibrary, search, typeFilter])

  const runImport = async (fileList) => {
    if (!fileList?.length) return
    setImporting(true)
    setImportStatus(`Importing ${fileList.length} file(s)…`)
    try {
      const { imported, failed } = await importMediaFiles(fileList, {
        existingItems: mediaLibrary,
        onProgress: (msg) => setImportStatus(msg),
      })
      if (imported.length) {
        onImportComplete(imported.map((r) => r.item))
        onNotify?.(`Imported ${imported.length} file(s).`, 'success')
      }
      if (failed.length) {
        onNotify?.(
          `${failed.length} failed: ${failed[0].error ?? 'see list'}`,
          'warning',
        )
      }
      setImportStatus(
        imported.length
          ? `Done: ${imported.length} imported, ${failed.length} failed.`
          : 'Import finished with errors.',
      )
    } catch (err) {
      onNotify?.(err?.message ?? 'Import failed.', 'error')
      setImportStatus('Import failed.')
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (item) => {
    const ok = window.confirm(
      `Delete “${item.displayTitle}” from the library?\n\nThis removes the offline copy from browser storage.`,
    )
    if (!ok) return
    releaseCachedObjectUrl(item.id)
    if (item.source === 'import' && item.offlineReady) {
      try {
        await deleteMediaBlob(item.id)
      } catch (err) {
        onNotify?.(err?.message ?? 'IndexedDB delete failed.', 'error')
        return
      }
    }
    const result = onDeleteMetadata(item.id)
    if (!result.success) onNotify?.(result.error, 'error')
    else onNotify?.('Media deleted.', 'success')
  }

  const count = mediaLibrary?.length ?? 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">Music library</h2>
          <p className="text-xs text-slate-500">{count} item(s) · local IndexedDB</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.mp4,audio/mpeg,video/mp4"
            multiple
            className="hidden"
            onChange={(e) => {
              runImport(e.target.files)
              e.target.value = ''
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept=".mp3,.mp4,audio/mpeg,video/mp4"
            multiple
            className="hidden"
            {...{ webkitdirectory: '' }}
            onChange={(e) => {
              runImport(e.target.files)
              e.target.value = ''
            }}
          />
          <Button
            size="sm"
            variant="gold"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            Import Files
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={importing}
            onClick={() => folderInputRef.current?.click()}
            title="Supported in Chromium-based browsers"
          >
            Import Folder
          </Button>
        </div>
      </div>

      {importStatus && (
        <p className="text-xs text-slate-400" aria-live="polite">{importStatus}</p>
      )}

      <InlineAlert tone="warning" title="Offline storage">
        Files are stored only in this browser. Quota limits or clearing site data
        can remove them. External URLs are streamed only and are not saved offline.
      </InlineAlert>

      <form
        className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-700 p-2"
        onSubmit={(e) => {
          e.preventDefault()
          const result = onAddExternalLink(externalUrl, externalTitle)
          if (!result.success) onNotify?.(result.error, 'error')
          else {
            onNotify?.('External link added (stream only).', 'success')
            setExternalUrl('')
            setExternalTitle('')
          }
        }}
      >
        <label className="min-w-[12rem] flex-1 text-xs text-slate-400">
          External MP3/MP4 URL (optional)
          <input
            className="mt-0.5 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://…/song.mp3"
          />
        </label>
        <label className="min-w-[8rem] text-xs text-slate-400">
          Display title
          <input
            className="mt-0.5 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
            value={externalTitle}
            onChange={(e) => setExternalTitle(e.target.value)}
          />
        </label>
        <Button type="submit" size="sm" variant="secondary">Add Link</Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search title or filename"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[10rem] flex-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
        >
          <option value="all">All types</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-600 py-8 text-center text-sm text-slate-400">
          {count === 0
            ? 'No media imported yet. Use Import Files or a folder from your laptop or pen drive.'
            : 'No matches for your search/filter.'}
        </div>
      ) : (
        <ul className="max-h-[24rem] space-y-1.5 overflow-y-auto">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-slate-700 bg-slate-800/60 p-2 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    key={`${item.id}-${item.displayTitle}`}
                    className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm font-medium text-white"
                    defaultValue={item.displayTitle}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (!v) return
                      if (v !== item.displayTitle) {
                        onUpdateMetadata(item.id, { displayTitle: v })
                        onNotify?.('Title updated.', 'info')
                      }
                    }}
                  />
                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    {item.originalFileName} · {formatFileSize(item.sizeBytes)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge tone="idle">{item.mediaType}</Badge>
                    {item.offlineReady ? (
                      <Badge tone="live">Offline-ready</Badge>
                    ) : item.source === 'external' ? (
                      <Badge tone="demo">Stream</Badge>
                    ) : (
                      <Badge tone="paused">Not ready</Badge>
                    )}
                  </div>
                  {item.importError && (
                    <p className="mt-1 text-xs text-red-300">{item.importError}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const r = onSelectForPlayback(item.id)
                      if (!r.success) onNotify?.(r.error, 'error')
                      else onNotify?.('Selected for playback.', 'success')
                    }}
                  >
                    Use
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-300"
                    onClick={() => handleDelete(item)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <label className="mt-2 block text-[11px] text-slate-500">
                Category
                <select
                  className="mt-0.5 w-full rounded border border-slate-600 bg-slate-900 px-1 py-1 text-xs"
                  value={item.category}
                  onChange={(e) => {
                    onUpdateMetadata(item.id, { category: e.target.value })
                    onNotify?.('Category updated.', 'info')
                  }}
                >
                  {MEDIA_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="mt-1 block text-[11px] text-slate-500">
                Assign to round
                <select
                  className="mt-0.5 w-full rounded border border-slate-600 bg-slate-900 px-1 py-1 text-xs"
                  value={item.assignedRoundId ?? ''}
                  onChange={(e) => {
                    onUpdateMetadata(item.id, {
                      assignedRoundId: e.target.value || null,
                    })
                    onNotify?.('Round assignment updated.', 'info')
                  }}
                >
                  <option value="">— None —</option>
                  {roundLibrary?.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

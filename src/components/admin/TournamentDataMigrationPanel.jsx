import { useCallback, useMemo, useRef, useState } from 'react'
import { Button } from '../common/Button.jsx'
import { InlineAlert } from '../common/InlineAlert.jsx'
import {
  downloadTournamentExportPackage,
} from '../../features/migration/tournamentExportModel.js'
import {
  matchMediaCatalogToFiles,
  readAllFilesFromDirectoryHandle,
} from '../../features/migration/mediaRelink.js'
import { collectMediaIdsFromRounds } from '../../features/migration/tournamentExportModel.js'

export function TournamentDataMigrationPanel({
  state,
  onExport,
  onValidateImport,
  onImport,
  onAuditMedia,
  onRelinkMatches,
  onNotify,
}) {
  const importInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const [pendingPackage, setPendingPackage] = useState(null)
  const [importMode, setImportMode] = useState('new')
  const [relinkReport, setRelinkReport] = useState(null)
  const [auditReport, setAuditReport] = useState(null)
  const [busy, setBusy] = useState(false)

  const referencedCatalog = useMemo(() => {
    if (!pendingPackage?.mediaCatalog) return []
    return pendingPackage.mediaCatalog
  }, [pendingPackage])

  const handleExport = () => {
    const pkg = onExport()
    downloadTournamentExportPackage(pkg)
    onNotify?.('Tournament JSON downloaded (media not included).', 'success')
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const text = await file.text()
      const raw = JSON.parse(text)
      const validation = onValidateImport(raw)
      if (!validation.valid) {
        onNotify?.(validation.errors.join(' '), 'error')
        setPendingPackage(null)
        return
      }
      setPendingPackage(raw)
      setRelinkReport(null)
      setAuditReport(null)
      onNotify?.('Import file validated. Choose import mode and confirm.', 'success')
    } catch {
      onNotify?.('Could not read JSON file.', 'error')
      setPendingPackage(null)
    } finally {
      setBusy(false)
    }
  }

  const runImport = async (forceDuplicate = false) => {
    if (!pendingPackage) return
    if (importMode === 'replace' && !forceDuplicate) {
      const ok = window.confirm(
        'Replace will overwrite the tournament plan, teams, and matching rounds from this export. Continue?',
      )
      if (!ok) return
    }
    setBusy(true)
    try {
      const result = await onImport(pendingPackage, {
        mode: importMode,
        forceDuplicate,
      })
      if (result.duplicate && !forceDuplicate) {
        const ok = window.confirm(
          `${result.errors?.[0] ?? 'Duplicate import.'}\n\nImport anyway as a new copy?`,
        )
        if (ok) {
          await runImport(true)
        }
        return
      }
      if (!result.success) {
        onNotify?.(result.errors?.join(' ') ?? 'Import failed.', 'error')
        return
      }
      onNotify?.('Tournament data imported. Relink media files before going live.', 'success')
      setPendingPackage(null)
    } finally {
      setBusy(false)
    }
  }

  const runAudit = useCallback(async () => {
    setBusy(true)
    try {
      const report = await onAuditMedia()
      setAuditReport(report)
      const need = report.missing?.length ?? 0
      if (need === 0) {
        onNotify?.('All offline media entries are present in this browser.', 'success')
      } else {
        onNotify?.(`${need} media file(s) still missing from IndexedDB.`, 'warning')
      }
    } finally {
      setBusy(false)
    }
  }, [onAuditMedia, onNotify])

  const processRelinkFiles = async (files) => {
    const catalog =
      referencedCatalog.length > 0
        ? referencedCatalog
        : (state.mediaLibrary ?? []).filter((m) =>
            collectMediaIdsFromRounds(state.roundLibrary).has(m.id),
          )
    const report = matchMediaCatalogToFiles(catalog, files)
    setRelinkReport(report)
    if (report.missing.length || report.duplicate.length || report.sizeMismatch.length) {
      onNotify?.(
        `Relink preview: ${report.missing.length} missing, ${report.duplicate.length} ambiguous, ${report.sizeMismatch.length} mismatched.`,
        'warning',
      )
      return
    }
    setBusy(true)
    try {
      const result = await onRelinkMatches(report.matched)
      if (result.failed?.length) {
        onNotify?.(
          `Relinked ${result.linked?.length ?? 0}; ${result.failed.length} failed.`,
          'error',
        )
      } else {
        onNotify?.(`Relinked ${result.linked?.length ?? 0} media file(s).`, 'success')
      }
      await runAudit()
    } finally {
      setBusy(false)
    }
  }

  const pickFolderViaInput = () => {
    folderInputRef.current?.click()
  }

  const pickFolderViaApi = async () => {
    if (!window.showDirectoryPicker) {
      pickFolderViaInput()
      return
    }
    setBusy(true)
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' })
      const files = await readAllFilesFromDirectoryHandle(handle)
      await processRelinkFiles(files)
    } catch (err) {
      if (err?.name !== 'AbortError') {
        onNotify?.(err?.message ?? 'Folder selection failed.', 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  const onFolderInputChange = async (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    setBusy(true)
    try {
      await processRelinkFiles(files)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-cyan-100">Tournament data migration</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Export JSON from the host PC, copy your built app (<code className="text-slate-300">dist</code>
          ), JSON, and the same media files on a pen drive. On the new PC, import JSON then relink
          media into IndexedDB. Media blobs are never embedded in the JSON.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={handleExport} disabled={busy}>
          Export Tournament Data
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => importInputRef.current?.click()}
          disabled={busy}
        >
          Import Tournament Data
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      {pendingPackage && (
        <div className="rounded border border-slate-600 bg-slate-950/60 p-2 space-y-2">
          <p className="text-xs text-slate-300">
            Ready: <strong>{pendingPackage.tournament?.name}</strong> ·{' '}
            {pendingPackage.roundLibrary?.length ?? 0} rounds ·{' '}
            {pendingPackage.mediaCatalog?.length ?? 0} media references
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-1.5 text-slate-300">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'new'}
                onChange={() => setImportMode('new')}
              />
              Import as new tournament
            </label>
            <label className="flex items-center gap-1.5 text-slate-300">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              Replace current tournament data
            </label>
          </div>
          <Button size="sm" variant="gold" onClick={() => runImport(false)} disabled={busy}>
            Confirm import
          </Button>
        </div>
      )}

      <div className="border-t border-slate-700/80 pt-2 space-y-2">
        <p className="text-xs font-medium text-slate-200">Media relinking</p>
        <p className="text-[11px] text-slate-500">
          Select the folder that contains your copied media files. Matching uses stable media IDs
          plus original file name and byte size; duplicate filenames without a unique size match are
          flagged. External URLs do not need files.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={pickFolderViaApi} disabled={busy}>
            Select media folder
          </Button>
          <Button size="sm" variant="ghost" onClick={runAudit} disabled={busy}>
            Check media in browser
          </Button>
        </div>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFolderInputChange}
          {...{ webkitdirectory: '', directory: '' }}
        />
        {typeof window !== 'undefined' && !window.showDirectoryPicker && (
          <p className="text-[10px] text-slate-500">
            This browser uses folder upload (webkitdirectory) instead of the File System Access API.
            Files are not kept open after import; blobs are stored in IndexedDB.
          </p>
        )}
      </div>

      {relinkReport && (
        <InlineAlert tone="info" title="Relink preview">
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            <li>Matched: {relinkReport.matched?.length ?? 0}</li>
            <li>Missing: {relinkReport.missing?.length ?? 0}</li>
            <li>Ambiguous (duplicate names): {relinkReport.duplicate?.length ?? 0}</li>
            <li>Size / type mismatch: {relinkReport.sizeMismatch?.length ?? 0}</li>
          </ul>
          {(relinkReport.missing?.length > 0 ||
            relinkReport.duplicate?.length > 0 ||
            relinkReport.sizeMismatch?.length > 0) && (
            <p className="mt-1 text-[11px]">
              Fix issues on disk or in the export, then select the folder again. Import is blocked
              until preview is clean.
            </p>
          )}
        </InlineAlert>
      )}

      {auditReport && (
        <InlineAlert
          tone={auditReport.missing?.length ? 'warning' : 'success'}
          title="IndexedDB media audit"
        >
          <span className="text-xs">
            Ready: {auditReport.ready?.length ?? 0} · Missing offline:{' '}
            {auditReport.missing?.length ?? 0} · External URLs:{' '}
            {auditReport.external?.length ?? 0}
          </span>
        </InlineAlert>
      )}
    </div>
  )
}

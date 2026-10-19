export function MusicPlayerPlaceholder({ musicPlayer }) {
  const label = musicPlayer?.label ?? 'Music player — Phase 2'

  return (
    <details className="rounded-lg border border-dashed border-slate-600/80 bg-slate-900/20">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Music player (Phase 2)
      </summary>
      <div className="border-t border-slate-700/50 px-3 pb-2 pt-1">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="mt-1 flex h-8 items-center justify-center rounded bg-slate-800/60 text-xs text-slate-600">
          Import &amp; playback coming in Phase 2
        </div>
      </div>
    </details>
  )
}

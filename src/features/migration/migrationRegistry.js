const REGISTRY_KEY = 'bollywood-antakshari-migration-registry'

export function loadMigrationRegistry() {
  const base = { imports: [] }
  if (typeof localStorage === 'undefined') return base
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.imports)) return base
    return {
      imports: parsed.imports.filter(
        (r) => r && typeof r.packageId === 'string' && r.packageId.trim(),
      ),
    }
  } catch {
    return base
  }
}

export function recordMigrationImport(entry) {
  if (typeof localStorage === 'undefined') return
  const registry = loadMigrationRegistry()
  const next = {
    packageId: entry.packageId,
    contentSignature: entry.contentSignature ?? null,
    tournamentId: entry.tournamentId ?? null,
    importedAt: entry.importedAt ?? Date.now(),
    mode: entry.mode ?? 'new',
  }
  const imports = registry.imports.filter((r) => r.packageId !== next.packageId)
  imports.push(next)
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify({ imports }))
  } catch {
    // quota / private mode
  }
}

export function clearMigrationRegistry() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(REGISTRY_KEY)
}

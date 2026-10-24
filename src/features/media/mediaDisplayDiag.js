/** Dev-only projector/media loading diagnostics (no blob contents). */
export function mediaDisplayDiag(label, payload = {}) {
  if (!import.meta.env.DEV) return
  console.debug(`[projector-media] ${label}`, payload)
}

/**
 * Build hash URL for projector route (GitHub Pages compatible).
 * @param {string} hashRoute e.g. '#/projector'
 */
export function buildAppUrl(hashRoute) {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}${hashRoute}`
}

/**
 * Open projector in a new window after user gesture.
 * @returns {{ window: Window | null, blocked: boolean, url: string }}
 */
export function openProjectorWindow() {
  const url = buildAppUrl('#/projector')
  const features =
    'noopener,noreferrer,width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
  const win = window.open(url, 'bollywood-antakshari-projector', features)

  if (!win || win.closed) {
    return { window: null, blocked: true, url }
  }

  try {
    win.focus()
  } catch {
    // cross-origin or policy
  }

  return { window: win, blocked: false, url }
}

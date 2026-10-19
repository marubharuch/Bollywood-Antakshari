/**
 * @param {HTMLElement | null} element
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function requestFullscreen(element) {
  const target = element ?? document.documentElement

  if (!document.fullscreenEnabled) {
    return {
      ok: false,
      active: false,
      message:
        'Fullscreen is not supported in this browser. Use F11 or the browser menu instead.',
    }
  }

  try {
    await target.requestFullscreen()
    return { ok: true, active: true }
  } catch {
    return {
      ok: false,
      active: Boolean(document.fullscreenElement),
      message:
        'Fullscreen was blocked. Click the button again, or use F11 after focusing this window.',
    }
  }
}

/**
 * @param {HTMLElement | null} element
 */
export async function toggleFullscreen(element) {
  const target = element ?? document.documentElement

  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen()
      return { ok: true, active: false }
    } catch {
      return {
        ok: false,
        active: true,
        message: 'Could not exit fullscreen. Press Esc or F11.',
      }
    }
  }

  return requestFullscreen(target)
}

export async function exitFullscreen() {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen()
    } catch {
      // ignore
    }
  }
}

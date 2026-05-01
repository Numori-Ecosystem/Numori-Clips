import { Capacitor } from '@capacitor/core'

/**
 * Wrapper around $fetch that prepends the API base URL.
 * On web (same-origin), apiBase is '' so paths stay relative.
 * On native Capacitor, apiBase is the server URL (e.g. https://notes.numori.app).
 *
 * On native platforms, injects an X-Device-Info header so the server can
 * identify the device as "Android" / "iOS" + model instead of "Chrome" / "Safari".
 */

// Resolve device info once on the client (platform never changes at runtime).
let _deviceInfoResolved = false
let _deviceInfoHeader = null

function resolveDeviceInfo() {
  if (_deviceInfoResolved) return
  _deviceInfoResolved = true
  try {
    if (!Capacitor.isNativePlatform()) return

    const platform = Capacitor.getPlatform() // 'android' | 'ios'
    let model = ''
    const ua = navigator.userAgent || ''
    if (platform === 'android') {
      // Match the model token between "Android <ver>; " and " Build/"
      const m = ua.match(/Android\s[\d.]+;\s*(.+?)\s*(?:Build\/|[;)])/)
      if (m) model = m[1].trim()
    } else if (platform === 'ios') {
      // iOS WebViews always report "iPhone" or "iPad" — grab it
      const m = ua.match(/(iPhone|iPad)/)
      if (m) model = m[1]
    }
    _deviceInfoHeader = model ? `${platform}; ${model}` : platform
  } catch {
    /* not on a native platform */
  }
}

export const useApi = () => {
  const apiBase = useApiBase()

  // Resolve once on first client-side call
  if (import.meta.client) resolveDeviceInfo()

  const apiFetch = (path, opts = {}) => {
    // Inject X-Device-Info for native apps
    if (_deviceInfoHeader) {
      opts = {
        ...opts,
        headers: { 'X-Device-Info': _deviceInfoHeader, ...opts.headers },
      }
    }
    return $fetch(`${apiBase}${path}`, opts)
  }

  /** Build a full URL (for EventSource, share links, etc.) */
  const apiUrl = (path) => {
    if (apiBase) return `${apiBase}${path}`
    // On web, use current origin
    return `${window.location.origin}${path}`
  }

  return { apiFetch, apiUrl }
}

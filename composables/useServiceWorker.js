/**
 * Composable for update detection and online/offline status.
 *
 * Both web and native compare the build-time __APP_VERSION__ (baked into the
 * JS bundle) against the server's version endpoint. If they differ, a new
 * version has been deployed.
 *
 * - Web: clicking "Reload" activates the waiting service worker.
 * - Native: clicking "Update" opens the app store link.
 *
 * Dismissing only hides that specific version — a newer release will re-trigger.
 * Poll interval is configurable via preferences (default 30 min).
 */
import db from '~/db.js'

export const useServiceWorker = () => {
  const updateAvailable = ref(false)
  const latestVersion = ref(null)
  const isOnline = useOnlineStatus()

  let swRegistration = null
  let pollTimer = null

  const { platform } = usePlatform()
  const config = useRuntimeConfig()

  const storeUrl = computed(() => {
    if (platform === 'android') return config.public.storeAndroid || ''
    if (platform === 'ios') return config.public.storeIos || ''
    return ''
  })

  const isNative = platform === 'android' || platform === 'ios'
  const buildVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0' // eslint-disable-line no-undef

  const DISMISSED_KEY = 'dismissed_update_version'

  const getDismissedVersion = async () => {
    try {
      const row = await db.appState.get(DISMISSED_KEY)
      return row?.value || null
    } catch {
      return null
    }
  }

  const setDismissedVersion = async (v) => {
    try {
      await db.appState.put({ key: DISMISSED_KEY, value: v })
    } catch {
      /* noop */
    }
  }

  /** Apply the update — reload for web, open store for native */
  const applyUpdate = () => {
    if (isNative) {
      const url =
        storeUrl.value ||
        (platform === 'android'
          ? 'https://play.google.com/store/apps/details?id=notes.numori.app'
          : '') ||
        (platform === 'ios' ? 'https://apps.apple.com/app/numori/id0000000000' : '')
      if (url) {
        window.location.href = url
        return
      }
    }
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
    } else {
      window.location.reload()
    }
  }

  /** Dismiss only this specific version */
  const dismissUpdate = async () => {
    if (latestVersion.value) await setDismissedVersion(latestVersion.value)
    updateAvailable.value = false
  }

  /**
   * Fetch the latest deployed version from the server.
   */
  async function fetchLatestVersion() {
    let url
    if (isNative) {
      if (!config.public.apiBase) return null
      url = `${config.public.apiBase}/api/version?_=${Date.now()}`
    } else {
      const origin = config.public.apiBase || window.location.origin
      url = `${origin}/version.json?_=${Date.now()}`
    }
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  }

  /**
   * Compare two semver-like version strings (e.g. "0.18.0" vs "0.20.0").
   * Returns true if `a` is newer than `b`.
   */
  function isNewerVersion(a, b) {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0
      const nb = pb[i] || 0
      if (na > nb) return true
      if (na < nb) return false
    }
    return false
  }

  /**
   * Compare the build version against the server.
   * Respects the dismissed version — won't re-show a dismissed update
   * unless a newer version appears.
   * @param {boolean} manual - If true, ignore dismissed version (user explicitly asked)
   * @returns {'available'|'up-to-date'|'error'}
   */
  async function checkForUpdate(manual = false) {
    try {
      const data = await fetchLatestVersion()
      if (!data?.version || !isNewerVersion(data.version, buildVersion)) {
        if (manual) updateAvailable.value = false
        return 'up-to-date'
      }
      latestVersion.value = data.version
      if (!manual) {
        const dismissed = await getDismissedVersion()
        if (data.version === dismissed) return 'up-to-date'
      }
      updateAvailable.value = true
      if (!isNative && navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.getRegistration()
        reg?.update()
      }
      return 'available'
    } catch {
      return 'error'
    }
  }

  /** Restart the poll timer with a new interval (minutes) */
  const setPollInterval = (minutes) => {
    if (pollTimer) clearInterval(pollTimer)
    if (minutes > 0) {
      pollTimer = setInterval(() => checkForUpdate(), minutes * 60 * 1000)
    }
  }

  if (import.meta.client) {
    window.addEventListener('sw-update-available', (e) => {
      swRegistration = e.detail?.registration || null
      updateAvailable.value = true
    })

    // Initial check after short delay
    setTimeout(() => checkForUpdate(), 3000)

    // Default poll — will be overridden by preferences once loaded
    setPollInterval(30)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })
  }

  return {
    updateAvailable,
    latestVersion,
    isOnline,
    isNative,
    storeUrl,
    applyUpdate,
    dismissUpdate,
    checkForUpdate,
    setPollInterval,
  }
}

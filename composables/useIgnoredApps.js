/**
 * Ignored Apps composable — manages a list of applications whose clipboard
 * content should be silently discarded.
 *
 * Each entry has:
 *   - name: display name (e.g. "Bitwarden")
 *   - enabled: whether filtering is active for this app
 *
 * The list is persisted locally in IndexedDB (appState table, key 'ignored_apps')
 * and synced to the server user profile when logged in.
 *
 * On Electron, the main process detects the foreground application at the
 * moment a clipboard change is captured and sends it alongside the content.
 * The renderer checks the app name against this list before storing the clip.
 */
import db from '~/db.js'

const STORAGE_KEY = 'ignored_apps'

/**
 * Default apps pre-populated for new users.
 * All disabled by default so nothing is filtered until the user opts in.
 */
const DEFAULT_APPS = [
  { name: '1Password', enabled: false },
  { name: 'Bitwarden', enabled: false },
  { name: 'KeePassXC', enabled: false },
  { name: 'LastPass', enabled: false },
  { name: 'Dashlane', enabled: false },
  { name: 'Enpass', enabled: false },
  { name: 'NordPass', enabled: false },
]

// Singleton state
const apps = ref([])
const loaded = ref(false)

export const useIgnoredApps = () => {
  const { apiFetch } = useApi()
  const auth = useAuth()

  // ── Local persistence ────────────────────────────────────────────────

  const saveLocal = async () => {
    try {
      await db.appState.put({ key: STORAGE_KEY, value: JSON.parse(JSON.stringify(apps.value)) })
    } catch (err) {
      console.error('[useIgnoredApps] Failed to save locally:', err)
    }
  }

  const loadLocal = async () => {
    try {
      const row = await db.appState.get(STORAGE_KEY)
      if (row?.value && Array.isArray(row.value)) {
        apps.value = row.value
      } else {
        apps.value = JSON.parse(JSON.stringify(DEFAULT_APPS))
        await saveLocal()
      }
    } catch {
      apps.value = JSON.parse(JSON.stringify(DEFAULT_APPS))
    }
    loaded.value = true
  }

  // ── Server sync ──────────────────────────────────────────────────────

  const saveToServer = async () => {
    if (!auth.user.value || !auth.authHeaders.value) return
    try {
      await apiFetch('/api/auth/ignored-apps', {
        method: 'PUT',
        headers: auth.authHeaders.value,
        body: { apps: apps.value },
      })
    } catch (err) {
      console.warn('[useIgnoredApps] Failed to sync to server:', err?.message || err)
    }
  }

  const loadFromServer = async () => {
    if (!auth.user.value || !auth.authHeaders.value) return
    try {
      const data = await apiFetch('/api/auth/ignored-apps', {
        headers: auth.authHeaders.value,
      })
      if (data?.apps && Array.isArray(data.apps)) {
        apps.value = data.apps
        await saveLocal()
      }
    } catch {
      // Server may not have this endpoint yet — that's fine
    }
  }

  // ── Public API ───────────────────────────────────────────────────────

  /** Initialise from local storage, then try server. */
  const init = async () => {
    if (loaded.value) return
    await loadLocal()
    await loadFromServer()
  }

  /** Toggle the enabled state of an app by index. */
  const toggleApp = async (index) => {
    if (index < 0 || index >= apps.value.length) return
    apps.value[index] = { ...apps.value[index], enabled: !apps.value[index].enabled }
    await saveLocal()
    await saveToServer()
    notifyElectron()
  }

  /** Add a new app to the list. */
  const addApp = async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return false
    // Prevent duplicates (case-insensitive)
    if (apps.value.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) return false
    apps.value.push({ name: trimmed, enabled: true })
    await saveLocal()
    await saveToServer()
    notifyElectron()
    return true
  }

  /** Remove an app from the list by index. */
  const removeApp = async (index) => {
    if (index < 0 || index >= apps.value.length) return
    apps.value.splice(index, 1)
    await saveLocal()
    await saveToServer()
    notifyElectron()
  }

  /**
   * Check whether a given app name should be ignored.
   * Matching is case-insensitive and supports partial/substring matching
   * so "Bitwarden" matches "Bitwarden Desktop" or "bitwarden".
   */
  const isAppIgnored = (appName) => {
    if (!appName) return false
    const lower = appName.toLowerCase()
    return apps.value.some(
      (a) => a.enabled && lower.includes(a.name.toLowerCase()),
    )
  }

  /** Send the current enabled-app list to the Electron main process. */
  const notifyElectron = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.setIgnoredApps) {
      const enabledNames = apps.value.filter((a) => a.enabled).map((a) => a.name)
      window.electronAPI.setIgnoredApps(enabledNames)
    }
  }

  return {
    apps,
    loaded,
    init,
    toggleApp,
    addApp,
    removeApp,
    isAppIgnored,
    notifyElectron,
  }
}

/**
 * App Lock composable — manages lock state, settings, and unlock logic.
 *
 * Settings are persisted both locally (IndexedDB) and on the server (users table).
 * On native platforms (Capacitor), biometric authentication is available via
 * the NativeBiometric plugin. Biometrics always fall back to PIN or password.
 *
 * Lock methods: 'pin' | 'password' | 'biometrics'
 * Timeout options: 0 (immediate), 60, 300, 900, 1800 (seconds)
 */
import db from '~/db.js'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'

/**
 * Register the NativeBiometric plugin directly via registerPlugin.
 * This avoids the bundler ESM interop issue where dynamic/static import
 * of the plugin package causes `.then()` to be called on the Capacitor
 * Proxy object (which intercepts all property access as native calls).
 */
const NativeBiometric = registerPlugin('NativeBiometric')

const SETTINGS_KEY = 'app_lock'

const BIOMETRIC_TYPE_MAP = {
  1: { id: 'touch_id', label: 'Touch ID', icon: 'mdi:fingerprint' },
  2: { id: 'face_id', label: 'Face ID', icon: 'mdi:face-recognition' },
  3: { id: 'fingerprint', label: 'Fingerprint', icon: 'mdi:fingerprint' },
  4: { id: 'face_auth', label: 'Face Authentication', icon: 'mdi:face-recognition' },
  5: { id: 'iris', label: 'Iris', icon: 'mdi:eye-outline' },
}

// Shared singleton state
const isLocked = ref(false)
const settings = reactive({
  enabled: false,
  method: 'pin',
  pin: '',
  password: '',
  timeout: 0,
  biometricsFallback: 'pin',
  selectedBiometrics: [],
})
const loaded = ref(false)
const availableBiometrics = ref([])
const biometricsEnrolled = ref(false)
const biometricError = ref(null) // { code, message } or null
let lastBackgroundTime = null

export const useAppLock = () => {
  const { apiFetch } = useApi()
  const auth = useAuth()

  /** Load settings from IndexedDB and lock on cold start if enabled */
  const loadSettings = async () => {
    if (!import.meta.client) return
    try {
      const row = await db.appState.get(SETTINGS_KEY)
      if (row?.value) {
        Object.assign(settings, row.value)
        if (!Array.isArray(settings.selectedBiometrics)) {
          settings.selectedBiometrics = []
        }
      }
    } catch {
      // first run
    }
    loaded.value = true

    // Cold start: always lock if app lock is enabled
    if (settings.enabled) {
      isLocked.value = true
    }
  }

  /**
   * Load settings from the server user profile (if logged in).
   * Waits for auth to be ready since restore() is async.
   */
  const loadFromServer = async () => {
    // Wait for auth.restore() to finish loading the user profile
    if (!auth.user.value) {
      await new Promise((resolve) => {
        const stop = watch(
          () => auth.user.value,
          (u) => {
            if (u) {
              stop()
              resolve()
            }
          },
          { immediate: true },
        )
        setTimeout(() => {
          stop()
          resolve()
        }, 5000)
      })
    }
    if (!auth.user.value?.appLockSettings) return
    try {
      const remote = auth.user.value.appLockSettings
      if (typeof remote === 'object' && remote !== null) {
        const wasEnabled = settings.enabled
        Object.assign(settings, remote)
        if (!Array.isArray(settings.selectedBiometrics)) {
          settings.selectedBiometrics = []
        }
        await saveLocal()
        // If server says enabled but we weren't locked yet, lock now
        if (settings.enabled && !wasEnabled) {
          isLocked.value = true
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  /** Persist settings to IndexedDB only */
  const saveLocal = async () => {
    if (!import.meta.client) return
    // toRaw/spread to strip Vue reactivity — IndexedDB structured clone can't handle Proxy
    const value = {
      enabled: settings.enabled,
      method: settings.method,
      pin: settings.pin,
      password: settings.password,
      timeout: settings.timeout,
      biometricsFallback: settings.biometricsFallback,
      selectedBiometrics: [...settings.selectedBiometrics],
    }
    await db.appState.put({ key: SETTINGS_KEY, value })
  }

  /** Persist settings to server (if logged in) */
  const saveToServer = async () => {
    if (!auth.isLoggedIn.value) return
    const body = {
      enabled: settings.enabled,
      method: settings.method,
      pin: settings.pin,
      password: settings.password,
      timeout: settings.timeout,
      biometricsFallback: settings.biometricsFallback,
      selectedBiometrics: [...settings.selectedBiometrics],
    }
    await apiFetch('/api/auth/app-lock', {
      method: 'PUT',
      headers: auth.authHeaders.value,
      body,
    })
  }

  /** Update settings and persist locally + server. Throws on failure. */
  const updateSettings = async (patch) => {
    Object.assign(settings, patch)
    await saveLocal()
    await saveToServer()
  }

  /** Lock the app */
  const lock = () => {
    if (settings.enabled) {
      isLocked.value = true
    }
  }

  /** Attempt unlock with the given credential */
  const unlock = (credential) => {
    const method = settings.method === 'biometrics' ? settings.biometricsFallback : settings.method
    if (method === 'pin' && credential === settings.pin) {
      isLocked.value = false
      return true
    }
    if (method === 'password' && credential === settings.password) {
      isLocked.value = false
      return true
    }
    return false
  }

  /** Attempt biometric unlock (native only). Returns true on success. */
  const unlockWithBiometrics = async () => {
    if (!Capacitor.isNativePlatform()) return false
    try {
      const result = await NativeBiometric.isAvailable()
      if (!result?.isAvailable) return false

      await NativeBiometric.verifyIdentity({
        reason: 'Unlock Numori Clips',
        title: 'Authenticate',
        maxAttempts: 3,
      })
      isLocked.value = false
      return true
    } catch (err) {
      console.warn('[AppLock] Biometric unlock failed:', err?.message || err)
      return false
    }
  }

  /** Detect available biometric types on this device. */
  const detectBiometrics = async () => {
    if (!Capacitor.isNativePlatform()) {
      availableBiometrics.value = []
      biometricsEnrolled.value = false
      biometricError.value = null
      return
    }

    try {
      const result = await NativeBiometric.isAvailable()

      const types = []
      const biometryType = result.biometryType

      if (biometryType === 6) {
        types.push(BIOMETRIC_TYPE_MAP[3])
        types.push(BIOMETRIC_TYPE_MAP[4])
      } else if (BIOMETRIC_TYPE_MAP[biometryType]) {
        types.push(BIOMETRIC_TYPE_MAP[biometryType])
      }

      availableBiometrics.value = types
      biometricsEnrolled.value = !!result?.isAvailable

      // Map errorCode to a user-facing message
      if (!result?.isAvailable && result?.errorCode != null) {
        const errorMessages = {
          1: 'Biometric hardware is unavailable on this device.',
          2: 'Biometrics locked out due to too many failed attempts. Try again later.',
          3: 'No biometrics enrolled. Set up fingerprint or face unlock in your device settings.',
          4: 'Biometrics temporarily locked. Wait 30 seconds and try again.',
          14: 'No screen lock set. Set up a PIN, pattern, or password in your device settings first.',
        }
        biometricError.value = {
          code: result.errorCode,
          message:
            errorMessages[result.errorCode] ||
            `Biometrics unavailable (error ${result.errorCode}).`,
        }
      } else {
        biometricError.value = null
      }
    } catch (err) {
      console.warn('[AppLock] Biometrics detection failed:', err?.message || err)
      availableBiometrics.value = []
      biometricsEnrolled.value = false
      biometricError.value = { code: -1, message: 'Failed to check biometric availability.' }
    }
  }

  /** Called when app goes to background */
  const onBackground = () => {
    if (!settings.enabled) return
    // timeout 0 = manual lock only, don't auto-lock on background
    if (settings.timeout > 0) {
      lastBackgroundTime = Date.now()
    }
  }

  /** Called when app returns to foreground */
  const onForeground = () => {
    if (!settings.enabled || isLocked.value) return
    if (lastBackgroundTime && settings.timeout > 0) {
      const elapsed = (Date.now() - lastBackgroundTime) / 1000
      if (elapsed >= settings.timeout) {
        lock()
      }
    }
    lastBackgroundTime = null
  }

  /** Set up background/foreground listeners */
  const initAppListeners = () => {
    if (!Capacitor.isNativePlatform()) {
      if (import.meta.client) {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') onBackground()
          else onForeground()
        })
      }
      return
    }
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) onBackground()
      else onForeground()
    })
  }

  /** Disable app lock entirely and reset */
  /** Disable app lock entirely and reset. Throws on failure. */
  const disable = async () => {
    settings.enabled = false
    settings.pin = ''
    settings.password = ''
    settings.method = 'pin'
    settings.timeout = 0
    settings.biometricsFallback = 'pin'
    settings.selectedBiometrics = []
    isLocked.value = false
    await saveLocal()
    await saveToServer()
  }

  /** Reset lock state for logout — clears local settings without touching the server. */
  const resetForLogout = async () => {
    settings.enabled = false
    settings.pin = ''
    settings.password = ''
    settings.method = 'pin'
    settings.timeout = 0
    settings.biometricsFallback = 'pin'
    settings.selectedBiometrics = []
    isLocked.value = false
    if (import.meta.client) {
      await db.appState.delete(SETTINGS_KEY)
    }
  }

  return {
    isLocked: readonly(isLocked),
    settings: readonly(settings),
    loaded: readonly(loaded),
    availableBiometrics: readonly(availableBiometrics),
    biometricsEnrolled: readonly(biometricsEnrolled),
    biometricError: readonly(biometricError),
    lock,
    unlock,
    unlockWithBiometrics,
    detectBiometrics,
    loadSettings,
    loadFromServer,
    updateSettings,
    disable,
    resetForLogout,
    initAppListeners,
    onBackground,
    onForeground,
  }
}

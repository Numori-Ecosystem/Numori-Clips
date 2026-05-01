/**
 * Privacy Screen composable — hides app content in the app switcher / recent apps.
 *
 * The setting is persisted on the server so it syncs across devices.
 * On platforms that don't support it (web), the setting is stored but ignored.
 */
import { Capacitor } from '@capacitor/core'

const enabled = ref(false)

export const usePrivacyScreen = () => {
  const isNative = Capacitor.isNativePlatform()
  const auth = useAuth()

  /** Apply the current enabled state to the native plugin (no-op on web). */
  const apply = async () => {
    if (!isNative) return
    try {
      const { PrivacyScreen } = await import('@capacitor/privacy-screen')
      if (enabled.value) {
        await PrivacyScreen.enable({
          android: { dimBackground: true, privacyModeOnActivityHidden: 'splash' },
          ios: { blurEffect: 'dark' },
        })
      } else {
        await PrivacyScreen.disable()
      }
    } catch (err) {
      console.warn('[PrivacyScreen] Failed to apply:', err?.message || err)
    }
  }

  /** Initialise from the server user profile object. */
  const loadFromUser = (user) => {
    if (!user) return
    enabled.value = user.privacyScreenEnabled === true
    apply()
  }

  /**
   * Load setting from the server user profile (waits for auth if needed).
   * Call this on app startup — mirrors useAppLock.loadFromServer().
   */
  const loadFromServer = async () => {
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
    if (!auth.user.value) return
    loadFromUser(auth.user.value)
  }

  /** Toggle and persist to server. Returns the new value. */
  const toggle = async ({ apiFetch, authHeaders }) => {
    const newVal = !enabled.value
    enabled.value = newVal
    apply()
    await apiFetch('/api/auth/privacy-screen', {
      method: 'PUT',
      headers: authHeaders,
      body: { enabled: newVal },
    })
    return newVal
  }

  return { enabled, isNative, loadFromUser, loadFromServer, toggle, apply }
}

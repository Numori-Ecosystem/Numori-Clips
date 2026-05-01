/**
 * Reactive online/offline status that works on both web and native Capacitor.
 *
 * On web: uses the standard navigator.onLine + online/offline events.
 * On native: uses @capacitor/network which hooks into the OS-level
 * connectivity APIs (ConnectivityManager on Android, NWPathMonitor on iOS).
 *
 * Returns a shared singleton ref so multiple composables don't duplicate listeners.
 */
import { Capacitor } from '@capacitor/core'

let _isOnline = null
let _initialized = false

export const useOnlineStatus = () => {
  // Singleton — all callers share the same ref
  if (!_isOnline) {
    _isOnline = ref(import.meta.client ? navigator.onLine : true)
  }

  if (import.meta.client && !_initialized) {
    _initialized = true

    if (Capacitor.isNativePlatform()) {
      // Native: use Capacitor Network plugin
      import('@capacitor/network').then(({ Network }) => {
        Network.getStatus().then((status) => {
          _isOnline.value = status.connected
        })
        Network.addListener('networkStatusChange', (status) => {
          _isOnline.value = status.connected
        })
      })
    } else {
      // Web: standard browser events
      window.addEventListener('online', () => { _isOnline.value = true })
      window.addEventListener('offline', () => { _isOnline.value = false })
    }
  }

  return _isOnline
}

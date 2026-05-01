import { Capacitor } from '@capacitor/core'

/**
 * Platform detection helper for Capacitor and Electron apps.
 */
export const usePlatform = () => {
  const isElectron = !!(window && window.electronAPI?.isElectron)
  const isNative = Capacitor.isNativePlatform() || isElectron
  const platform = isElectron ? 'electron' : Capacitor.getPlatform() // 'android' | 'ios' | 'electron' | 'web'

  return { isNative, isElectron, platform }
}

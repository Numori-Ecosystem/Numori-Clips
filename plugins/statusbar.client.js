import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return

  const colorMode = useColorMode()

  /** @param {string} mode */
  const syncStatusBar = (mode) => {
    const isDark = mode === 'dark'
    StatusBar.setBackgroundColor({ color: isDark ? '#221F22' : '#F5F4F2' })
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
  }

  // Set initial state
  syncStatusBar(colorMode.value)

  // React to theme changes
  watch(
    () => colorMode.value,
    (mode) => syncStatusBar(mode),
  )
})

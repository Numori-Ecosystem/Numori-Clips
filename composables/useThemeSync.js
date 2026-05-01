/**
 * Syncs the Nuxt colorMode with the Electron main process.
 *
 * When running inside Electron, this composable:
 * 1. Notifies the main process of the current theme on mount.
 * 2. Watches for colorMode changes and forwards them to the main process.
 * 3. Listens for theme-changed broadcasts from the main process (triggered
 *    when another window changes the theme) and applies them locally.
 *
 * Safe to call in non-Electron environments — it simply no-ops.
 */
export function useThemeSync() {
  const colorMode = useColorMode()
  const { isElectron } = usePlatform()

  if (!isElectron) return

  // Listen for theme broadcasts from the main process
  onMounted(() => {
    if (window.electronAPI?.onTrayAction) {
      window.electronAPI.onTrayAction((data) => {
        if (data.action === 'theme-changed' && data.value) {
          colorMode.preference = data.value
        }
      })
    }

    // Tell the main process what our current theme is
    if (window.electronAPI?.notifyThemeChanged) {
      window.electronAPI.notifyThemeChanged(colorMode.preference)
    }
  })

  // Forward local theme changes to the main process
  watch(() => colorMode.preference, (newTheme) => {
    if (window.electronAPI?.notifyThemeChanged) {
      window.electronAPI.notifyThemeChanged(newTheme)
    }
  })
}

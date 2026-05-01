import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * Capacitor back-button interception plugin.
 *
 * Listens for the hardware back button on Android and delegates to the
 * useBackButton composable's handler stack. If no handler consumes the event,
 * the app minimizes (moves to background) instead of closing.
 */
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return

  const { invoke } = useBackButton()

  App.addListener('backButton', () => {
    const consumed = invoke()
    if (!consumed) {
      // No modal/drawer open — minimize the app instead of exiting
      App.minimizeApp()
    }
  })
})

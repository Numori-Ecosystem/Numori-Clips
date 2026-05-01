<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925 overscroll-none">
    <OfflineIndicator :offline="!isOnline" />

    <EmailVerificationBanner
      v-if="auth.isLoggedIn.value && auth.user.value?.emailVerified === false"
      :visible="true"
      @click="openVerifyEmail"
    />

    <div class="flex-1 flex overflow-hidden">
      <main class="flex-1 overflow-hidden flex flex-col isolate relative">
        <ClipPanel ref="clipPanelRef" @dismiss="dismissMainWindow" />
      </main>
    </div>

    <UpdateNotification
      :visible="sw.updateAvailable.value"
      :is-native="sw.isNative"
      @apply="sw.applyUpdate"
      @dismiss="sw.dismissUpdate"
    />

    <ToastNotification :toasts="toast.toasts.value" />

    <AppLockScreen
      :show="appLock.isLocked.value"
      :preferences="localePrefs.preferences"
      @logout="authHandlers.handleLogout"
    />
  </div>
</template>

<script setup>
import { useAuthHandlers } from '~/composables/useAuthHandlers'
import { useClipboard } from '~/composables/useClipboard'

const { isElectron } = usePlatform()
const colorMode = useColorMode()
const localePrefs = useLocalePreferences()
const welcomeWizard = useWelcomeWizard()
const auth = useAuth()
const toast = useToast()
const appLock = useAppLock()
const privacyScreen = usePrivacyScreen()
const sw = useServiceWorker()
const isOnline = useOnlineStatus()
const clipboard = useClipboard()

const authHandlers = useAuthHandlers({ auth, appLock })

const clipPanelRef = ref(null)

// --- Service worker update check interval ---
watch(() => localePrefs.preferences.updateCheckInterval, (val) => { sw.setPollInterval(val ?? 30) })
localePrefs.ready.then(() => { sw.setPollInterval(localePrefs.preferences.updateCheckInterval ?? 30) })

const dismissMainWindow = () => {
  if (isElectron) {
    globalThis.window?.electronAPI?.dismissMainWindow()
  }
}

const openVerifyEmail = () => {
  if (isElectron && globalThis.window?.electronAPI?.openVerifyEmailWindow) {
    globalThis.window.electronAPI.openVerifyEmailWindow()
  } else {
    navigateTo('/verify-email')
  }
}

// --- Lifecycle ---
onMounted(async () => {
  // On Electron, check if wizard needs to show first
  if (isElectron) {
    await welcomeWizard.showIfFirstTime()
    if (welcomeWizard.isOpen.value) {
      welcomeWizard.isOpen.value = false
      globalThis.window?.electronAPI?.openWizardWindow()
      return
    }
  }

  await appLock.loadSettings()
  appLock.initAppListeners()
  appLock.detectBiometrics()
  appLock.loadFromServer()
  privacyScreen.loadFromServer()
  await clipboard.init()

  // Sync saved shortcuts to main process
  await localePrefs.ready
  if (globalThis.window?.electronAPI?.updateShortcuts) {
    globalThis.window.electronAPI.updateShortcuts({
      togglePanel: localePrefs.preferences.shortcutTogglePanel || 'Super+Shift+V',
      toggleIncognito: localePrefs.preferences.shortcutToggleIncognito || null,
    })
  }

  if (window.electronAPI?.onTrayAction) {
    window.electronAPI.onTrayAction(async (data) => {
      if (data.action === 'theme-changed') {
        colorMode.preference = data.value
      }
      if (data.action === 'toggle-incognito') {
        clipboard.incognitoMode.value = !clipboard.incognitoMode.value
        globalThis.window?.electronAPI?.setIncognito(clipboard.incognitoMode.value)
      }
      if (data.action === 'wizard-completed') {
        await welcomeWizard.complete()
      }
    })
  }

  if (window.electronAPI?.notifyThemeChanged) {
    window.electronAPI.notifyThemeChanged(colorMode.preference)
  }
})

onUnmounted(() => {
  clipboard.destroy()
})

watch(() => colorMode.preference, (newTheme) => {
  if (window.electronAPI?.notifyThemeChanged) {
    window.electronAPI.notifyThemeChanged(newTheme)
  }
})

watch(() => auth.user.value, async (newUser, oldUser) => {
  if (newUser && !oldUser) {
    await auth.refreshUser()
    appLock.loadFromServer()
    privacyScreen.loadFromServer()
  }
})
</script>

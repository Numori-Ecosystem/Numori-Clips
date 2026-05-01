<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925 overscroll-none">
    <OfflineIndicator :offline="!isOnline" />

    <EmailVerificationBanner
      v-if="auth.isLoggedIn.value && auth.user.value?.emailVerified === false"
      :visible="true"
      @click="authHandlers.showEmailVerificationModal.value = true"
    />

    <div class="flex-1 flex overflow-hidden">
      <main class="flex-1 overflow-hidden flex flex-col isolate relative">
        <ClipPanel ref="clipPanelRef" @dismiss="dismissMainWindow" @open-settings="openSettings()" />
      </main>
    </div>

    <!-- Settings modal (web/mobile only) -->
    <SettingsModal
      v-if="!isElectron"
      :is-open="showSettings"
      :initial-section="settingsInitialSection"
      :preferences="localePrefs.preferences"
      :save="localePrefs.save"
      :user="auth.user.value"
      :auth-headers="auth.authHeaders.value"
      :on-delete-data="authHandlers.handleDeleteData"
      :on-delete-account="authHandlers.handleDeleteAccount"
      @close="showSettings = false; settingsInitialSection = null"
      @relaunch-wizard="relaunchWizard"
      @update-profile="authHandlers.handleUpdateProfile"
      @change-password="(...args) => { authHandlers.handleChangePassword(...args); showSettings = false }"
      @logout="() => { showSettings = false; authHandlers.handleLogout() }"
    />

    <!-- Welcome wizard modal (web/mobile only) -->
    <WelcomeWizard
      v-if="!isElectron"
      :is-open="welcomeWizard.isOpen.value"
      :preferences="localePrefs.preferences"
      :apply-preset="localePrefs.applyPreset"
      :save-preferences="localePrefs.save"
      @complete="welcomeWizard.complete()"
    />

    <AuthModal
      :is-open="authHandlers.showAuthModal.value"
      :loading="auth.loading.value"
      :error="auth.error.value"
      @close="authHandlers.showAuthModal.value = false"
      @login="authHandlers.handleLogin"
      @register="authHandlers.handleRegister"
      @forgot-password="authHandlers.handleForgotPassword"
      @verify-recovery="authHandlers.handleVerifyRecovery"
      @reset-password="authHandlers.handleResetPassword"
    />

    <EmailVerificationModal
      :is-open="authHandlers.showEmailVerificationModal.value"
      :loading="auth.loading.value"
      :error="auth.error.value"
      @close="authHandlers.showEmailVerificationModal.value = false"
      @verify="authHandlers.handleVerifyEmail"
      @resend="authHandlers.handleResendVerification"
    />

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

// --- UI state ---
const showSettings = ref(false)
const settingsInitialSection = ref(null)
const clipPanelRef = ref(null)

// --- Service worker update check interval ---
watch(() => localePrefs.preferences.updateCheckInterval, (val) => { sw.setPollInterval(val ?? 30) })
localePrefs.ready.then(() => { sw.setPollInterval(localePrefs.preferences.updateCheckInterval ?? 30) })

const openSettings = (section) => {
  if (isElectron && window.electronAPI?.openSettingsWindow) {
    window.electronAPI.openSettingsWindow(section || undefined)
  } else {
    settingsInitialSection.value = section || 'general'
    showSettings.value = true
  }
}

const dismissMainWindow = () => {
  if (isElectron) {
    globalThis.window?.electronAPI?.dismissMainWindow()
  }
}

const relaunchWizard = () => {
  showSettings.value = false
  if (isElectron && window.electronAPI?.openWizardWindow) {
    window.electronAPI.openWizardWindow()
  } else {
    welcomeWizard.isOpen.value = true
  }
}

// --- Lifecycle ---
onMounted(async () => {
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

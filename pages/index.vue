<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925 overscroll-none">
    <!-- ═══ About window ═══ -->
    <template v-if="isAboutWindow">
      <AboutPage />
    </template>

    <!-- ═══ Wizard window ═══ -->
    <template v-else-if="isWizardWindow">
      <WelcomeWizardPage />
    </template>

    <!-- ═══ Settings window ═══ -->
    <template v-else-if="isSettingsWindow">
      <SettingsPage
        :initial-section="settingsWindowSection"
        :preferences="localePrefs.preferences"
        :save="localePrefs.save"
        :user="auth.user.value"
        :auth-headers="auth.authHeaders.value"
        :on-delete-data="authHandlers.handleDeleteData"
        :on-delete-account="authHandlers.handleDeleteAccount"
        @update-profile="authHandlers.handleUpdateProfile"
        @change-password="authHandlers.handleChangePassword"
        @logout="authHandlers.handleLogout"
      />
      <ToastNotification :toasts="toast.toasts.value" />
    </template>

    <!-- ═══ Auth window ═══ -->
    <template v-else-if="isAuthWindow">
      <AuthPage />
    </template>

    <!-- ═══ Normal main window ═══ -->
    <template v-else>
      <!-- Checking extension status -->
      <div v-if="extensionBlocked === null" class="h-full flex items-center justify-center bg-white dark:bg-gray-925">
        <Icon name="mdi:loading" class="w-6 h-6 text-gray-400 animate-spin" />
      </div>

      <!-- Extension blocker -->
      <div v-else-if="extensionBlocked" class="h-full flex flex-col bg-white dark:bg-gray-925">
        <ExtensionSetup @continue="recheckExtension" @status-changed="onExtensionStatus" />
      </div>

      <template v-else>
        <OfflineIndicator :offline="!isOnline" />

      <EmailVerificationBanner
        v-if="auth.isLoggedIn.value && auth.user.value?.emailVerified === false"
        :visible="true"
        @click="authHandlers.showEmailVerificationModal.value = true"
      />

      <div class="flex-1 flex overflow-hidden">
        <main class="flex-1 overflow-hidden flex flex-col isolate relative">
          <ClipPanel ref="clipPanelRef" @dismiss="dismissMainWindow" />
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
      </template>
    </template>
  </div>
</template>

<script setup>
import { useAuthHandlers } from '~/composables/useAuthHandlers'
import { useClipboard } from '~/composables/useClipboard'

const { isElectron } = usePlatform()
const colorMode = useColorMode()
const route = useRoute()
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

// --- Detect window mode via query param ---
const isSettingsWindow = computed(() => route.query.window === 'settings')
const isAboutWindow = computed(() => route.query.window === 'about')
const isWizardWindow = computed(() => route.query.window === 'wizard')
const isAuthWindow = computed(() => route.query.window === 'auth')
const isSubWindow = computed(() => isSettingsWindow.value || isAboutWindow.value || isWizardWindow.value || isAuthWindow.value)
const settingsWindowSection = computed(() => route.query.section || 'general')

// --- Service worker update check interval ---
watch(() => localePrefs.preferences.updateCheckInterval, (val) => { sw.setPollInterval(val ?? 30) })
localePrefs.ready.then(() => { sw.setPollInterval(localePrefs.preferences.updateCheckInterval ?? 30) })

// --- UI state (main window only) ---
const showSettings = ref(false)
const settingsInitialSection = ref(null)
const clipPanelRef = ref(null)
const extensionBlocked = ref(null) // null = checking, true = blocked, false = ok

const onExtensionStatus = (status) => {
  extensionBlocked.value = (status === 'not-installed' || status === 'installed-needs-restart')
}

const recheckExtension = async () => {
  if (globalThis.window?.electronAPI?.getExtensionStatus) {
    const status = await globalThis.window.electronAPI.getExtensionStatus()
    extensionBlocked.value = (status === 'not-installed' || status === 'installed-needs-restart')
    if (!extensionBlocked.value) {
      globalThis.window?.electronAPI?.repositionMainWindow()
      await initMainWindow()
    }
  } else {
    extensionBlocked.value = false
    await initMainWindow()
  }
}

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
  if (isSubWindow.value) return

  // Check if GNOME extension is needed but not working
  if (isElectron && globalThis.window?.electronAPI?.getExtensionStatus) {
    const extStatus = await globalThis.window.electronAPI.getExtensionStatus()
    if (extStatus === 'not-installed' || extStatus === 'installed-needs-restart') {
      extensionBlocked.value = true
    } else {
      extensionBlocked.value = false
    }
  } else {
    extensionBlocked.value = false
  }

  // On Electron, check if wizard needs to show
  await welcomeWizard.showIfFirstTime()
  if (isElectron && welcomeWizard.isOpen.value) {
    welcomeWizard.isOpen.value = false
    globalThis.window?.electronAPI?.openWizardWindow()
    return
  }

  // If extension is blocking, don't init the main window yet
  if (extensionBlocked.value) return

  await initMainWindow()
})

const initMainWindow = async () => {
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
        // Recheck extension status — wizard may have installed/enabled it
        if (globalThis.window?.electronAPI?.getExtensionStatus) {
          const extStatus = await globalThis.window.electronAPI.getExtensionStatus()
          extensionBlocked.value = (extStatus === 'not-installed' || extStatus === 'installed-needs-restart')
        }
        if (!extensionBlocked.value) {
          globalThis.window?.electronAPI?.repositionMainWindow()
          await initMainWindow()
        }
      }
    })
  }

  if (window.electronAPI?.notifyThemeChanged) {
    window.electronAPI.notifyThemeChanged(colorMode.preference)
  }
}

onUnmounted(() => {
  if (!isSubWindow.value) {
    clipboard.destroy()
  }
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

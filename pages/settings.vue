<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925 overscroll-none">
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
  </div>
</template>

<script setup>
import { useAuthHandlers } from '~/composables/useAuthHandlers'

definePageMeta({ layout: false })

const route = useRoute()
const localePrefs = useLocalePreferences()
const auth = useAuth()
const toast = useToast()
const appLock = useAppLock()

const authHandlers = useAuthHandlers({ auth, appLock })

const settingsWindowSection = computed(() => route.query.section || 'general')
</script>

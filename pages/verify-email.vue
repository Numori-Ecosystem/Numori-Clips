<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925 overscroll-none">
    <!-- Title bar -->
    <div
      class="flex items-center px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-100 dark:bg-gray-900"
      :class="{ 'electron-drag': isElectron }"
    >
      <div v-if="isElectron" class="flex items-center gap-1.5 electron-no-drag group/traffic">
        <button class="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none flex items-center justify-center" title="Close" @click="handleClose">
          <Icon name="mdi:close" class="w-2.5 h-2.5 text-red-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
        </button>
        <button class="w-5 h-5 rounded-full bg-yellow-500 hover:bg-yellow-600 focus:outline-none flex items-center justify-center" title="Minimize" @click="handleMinimize">
          <Icon name="mdi:minus" class="w-2.5 h-2.5 text-yellow-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
        </button>
      </div>
      <div class="flex items-center gap-2 ml-2">
        <UiButton v-if="!isElectron" variant="ghost" color="gray" icon-only size="sm" @click="goBack">
          <Icon name="mdi:arrow-left" class="block w-5 h-5" />
        </UiButton>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-200 leading-none">Verify Email</h2>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-5 flex flex-col items-center">
      <div class="w-full max-w-sm">
        <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">
          Enter the 6-digit code sent to your email address.
        </p>

        <UiAlert v-if="auth.error.value" color="red" class="mb-3">{{ auth.error.value }}</UiAlert>
        <UiAlert v-if="success" color="green" class="mb-3">{{ success }}</UiAlert>

        <form class="space-y-3" @submit.prevent="handleVerify">
          <UiFormField label="Verification Code">
            <UiInput
              v-model="code"
              type="text"
              required
              :maxlength="6"
              pattern="[0-9]{6}"
              validation-pattern="^[0-9]{6}$"
              validation-message="Enter a 6-digit code"
              placeholder="000000"
            />
          </UiFormField>
          <UiButton
            native-type="submit"
            block
            :loading="auth.loading.value"
            :disabled="auth.loading.value || code.length !== 6"
          >
            Verify
          </UiButton>
        </form>

        <p class="text-center text-xs text-gray-500 dark:text-gray-500 mt-3">
          Didn't receive a code?
          <UiButton
            variant="link"
            color="primary"
            :disabled="auth.loading.value || resendCooldown > 0"
            @click="handleResend"
          >
            {{ resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code' }}
          </UiButton>
        </p>
      </div>
    </div>

    <ToastNotification :toasts="toast.toasts.value" />
  </div>
</template>

<script setup>
import { useAuthHandlers } from '~/composables/useAuthHandlers'

definePageMeta({ layout: false })

const { isElectron } = usePlatform()
const router = useRouter()
const auth = useAuth()
const toast = useToast()
const appLock = useAppLock()
const authHandlers = useAuthHandlers({ auth, appLock })

const handleClose = () => globalThis.window?.electronAPI?.close()
const handleMinimize = () => globalThis.window?.electronAPI?.minimize()
const goBack = () => router.back()

const code = ref('')
const success = ref(null)
const resendCooldown = ref(0)
let cooldownTimer = null

const handleVerify = async () => {
  await authHandlers.handleVerifyEmail(code.value)
  if (!auth.error.value) {
    toast.show('Email verified', { type: 'success', icon: 'mdi:check-circle-outline' })
    if (isElectron) handleClose()
    else router.back()
  }
}

const handleResend = async () => {
  await authHandlers.handleResendVerification()
  success.value = 'A new code has been sent to your email.'
  resendCooldown.value = 60
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}

onBeforeUnmount(() => clearInterval(cooldownTimer))
</script>

<style scoped>
.electron-drag { -webkit-app-region: drag; }
.electron-no-drag,
.electron-drag :deep(button),
.electron-drag :deep(a),
.electron-drag :deep(input) { -webkit-app-region: no-drag; }
</style>

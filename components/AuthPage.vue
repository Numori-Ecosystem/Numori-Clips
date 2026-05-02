<!--
  Standalone Auth page — rendered directly as window content (no modal).
  The form content is extracted from AuthModal without the UiWindow wrapper.
-->
<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925">
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
        <UiButton v-if="!isElectron" variant="ghost" color="gray" icon-only size="sm" @click="handleClose">
          <Icon name="mdi:arrow-left" class="block w-5 h-5" />
        </UiButton>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-200 leading-none">{{ headerTitle }}</h2>
      </div>
    </div>

    <!-- Auth form content -->
    <div class="flex-1 overflow-y-auto p-5">
      <!-- ═══ Login / Register ═══ -->
      <template v-if="step === 'auth'">
        <UiButtonsGroup variant="tabs" class="mb-4" :model-value="mode" :options="[{ value: 'login', label: 'Sign In' }, { value: 'register', label: 'Create Account' }]" @update:model-value="switchMode($event)" />

        <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">
          {{ mode === 'login' ? 'Sign in to sync your clips across devices.' : 'Signing up is optional. It enables cloud sync across devices.' }}
        </p>

        <UiAlert v-if="auth.error.value" color="red" class="mb-3">{{ auth.error.value }}</UiAlert>

        <form class="space-y-3" @submit.prevent="handleSubmit">
          <UiFormField v-if="mode === 'register'" label="Name">
            <UiInput v-model="name" type="text" autocomplete="name" placeholder="Your name (optional)" :validate="false" />
          </UiFormField>
          <UiFormField label="Email">
            <UiInput v-model="email" type="email" required autocomplete="email" placeholder="you@example.com" />
          </UiFormField>
          <div>
            <UiFormField label="Password">
              <UiInput v-model="password" type="password" required autocomplete="current-password" :minlength="mode === 'register' ? 8 : undefined" placeholder="••••••••" :validate="false" />
            </UiFormField>
            <p v-if="mode === 'register'" class="text-xs text-gray-500 dark:text-gray-500 mt-1">At least 8 characters</p>
          </div>
          <div v-if="mode === 'register'">
            <UiFormField label="Confirm Password">
              <UiInput v-model="confirmPassword" type="password" required autocomplete="new-password" :minlength="8" placeholder="••••••••" :validate="false" />
            </UiFormField>
            <p v-if="passwordMismatch" class="text-xs text-red-600 dark:text-red-400 mt-1">Passwords do not match</p>
          </div>
          <UiButton native-type="submit" :loading="auth.loading.value" block>{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</UiButton>
        </form>
        <p v-if="mode === 'login'" class="text-center text-xs text-gray-500 dark:text-gray-500 mt-3">
          <UiButton variant="link" color="primary" @click="startRecovery">Forgot password?</UiButton>
        </p>
      </template>

      <!-- ═══ Recovery: Enter Email ═══ -->
      <template v-else-if="step === 'recovery-email'">
        <UiAlert color="red" icon="mdi:database-remove-outline" bordered class="mb-4">
          <p class="text-xs text-red-700 dark:text-red-300 leading-relaxed">
            Password recovery will <span class="font-semibold">permanently delete all your encrypted clips</span>. They cannot be decrypted without the original password.
          </p>
        </UiAlert>
        <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">Enter your email address. If password recovery is enabled on your account, you'll receive a code.</p>
        <UiAlert v-if="auth.error.value" color="red" class="mb-3">{{ auth.error.value }}</UiAlert>
        <form class="space-y-3" @submit.prevent="handleForgotPassword">
          <UiFormField label="Email"><UiInput v-model="recoveryEmail" type="email" required placeholder="you@example.com" /></UiFormField>
          <UiButton native-type="submit" :loading="auth.loading.value" block>Send Recovery Code</UiButton>
        </form>
        <p class="text-center text-xs text-gray-500 dark:text-gray-500 mt-3">
          <UiButton variant="link" color="primary" @click="step = 'auth'; mode = 'login'">Back to sign in</UiButton>
        </p>
      </template>

      <!-- ═══ Recovery: Enter OTP ═══ -->
      <template v-else-if="step === 'recovery-otp'">
        <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">
          If your account has recovery enabled, a 6-digit code was sent to <span class="font-medium text-gray-700 dark:text-gray-300">{{ recoveryEmail }}</span>.
        </p>
        <UiAlert v-if="auth.error.value" color="red" class="mb-3">{{ auth.error.value }}</UiAlert>
        <form class="space-y-3" @submit.prevent="handleVerifyRecovery">
          <UiFormField label="Verification Code">
            <UiInput v-model="otpCode" type="text" required :maxlength="6" pattern="[0-9]{6}" placeholder="000000" />
          </UiFormField>
          <UiButton native-type="submit" :disabled="auth.loading.value || otpCode.length !== 6" :loading="auth.loading.value" block>Verify Code</UiButton>
        </form>
        <p class="text-center text-xs text-gray-500 dark:text-gray-500 mt-3">
          <UiButton variant="link" color="primary" @click="step = 'recovery-email'">Use a different email</UiButton>
        </p>
      </template>

      <!-- ═══ Recovery: New Password ═══ -->
      <template v-else-if="step === 'recovery-newpass'">
        <UiAlert color="red" icon="mdi:database-remove-outline" bordered size="md" class="mb-4">
          <p class="text-xs font-semibold text-red-800 dark:text-red-200">All your clips will be permanently deleted</p>
          <p class="text-xs text-red-700 dark:text-red-300 leading-relaxed">
            Your clips are encrypted with your current password. Resetting it means the encryption key is lost — <span class="font-semibold">every clip will be irreversibly destroyed</span>. This cannot be undone.
          </p>
        </UiAlert>
        <UiAlert v-if="auth.error.value" color="red" class="mb-3">{{ auth.error.value }}</UiAlert>
        <form class="space-y-3" @submit.prevent="handleResetPassword">
          <UiFormField label="New Password" hint="At least 8 characters">
            <UiInput v-model="newPassword" type="password" required :minlength="8" placeholder="••••••••" :validate="false" />
          </UiFormField>
          <div>
            <UiFormField label="Confirm New Password">
              <UiInput v-model="confirmNewPassword" type="password" required :minlength="8" placeholder="••••••••" :validate="false" />
            </UiFormField>
            <p v-if="confirmNewPassword && newPassword !== confirmNewPassword" class="text-xs text-red-600 dark:text-red-400 mt-1">Passwords do not match</p>
          </div>
          <UiButton native-type="submit" color="red" :disabled="auth.loading.value || !newPassword || newPassword.length < 8 || newPassword !== confirmNewPassword" :loading="auth.loading.value" block>
            Reset Password &amp; Delete Clips
          </UiButton>
        </form>
      </template>
    </div>

    <ToastNotification :toasts="toast.toasts.value" />
  </div>
</template>

<script setup>
import { useAuthHandlers } from '~/composables/useAuthHandlers'

const { isElectron } = usePlatform()
const auth = useAuth()
const toast = useToast()
const appLock = useAppLock()
const authHandlers = useAuthHandlers({ auth, appLock })

const handleClose = () => {
  if (isElectron) globalThis.window?.electronAPI?.close()
  else navigateTo('/clips')
}
const handleMinimize = () => globalThis.window?.electronAPI?.minimize()

// Non-Electron: navigateTo handles routing

const step = ref('auth')
const mode = ref('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const name = ref('')
const recoveryEmail = ref('')
const otpCode = ref('')
const recoveryToken = ref(null)
const newPassword = ref('')
const confirmNewPassword = ref('')

const passwordMismatch = computed(() => mode.value === 'register' && confirmPassword.value && password.value !== confirmPassword.value)

const headerTitle = computed(() => {
  switch (step.value) {
    case 'auth': return mode.value === 'login' ? 'Welcome Back' : 'Create Account'
    case 'recovery-email': return 'Recover Password'
    case 'recovery-otp': return 'Enter Code'
    case 'recovery-newpass': return 'New Password'
    default: return 'Sign In'
  }
})

const switchMode = (m) => { mode.value = m; email.value = ''; password.value = ''; confirmPassword.value = ''; name.value = '' }

const handleSubmit = async () => {
  if (mode.value === 'register' && password.value !== confirmPassword.value) return
  if (mode.value === 'login') {
    await authHandlers.handleLogin({ email: email.value, password: password.value })
  } else {
    await authHandlers.handleRegister({ email: email.value, password: password.value, name: name.value })
  }
  if (auth.isLoggedIn.value) handleClose()
}

const startRecovery = () => { recoveryEmail.value = email.value || ''; step.value = 'recovery-email' }

const handleForgotPassword = () => {
  authHandlers.handleForgotPassword({
    email: recoveryEmail.value,
    onSuccess: () => { step.value = 'recovery-otp'; otpCode.value = '' },
  })
}

const handleVerifyRecovery = () => {
  authHandlers.handleVerifyRecovery({
    email: recoveryEmail.value,
    code: otpCode.value,
    onSuccess: (token) => { recoveryToken.value = token; step.value = 'recovery-newpass' },
  })
}

const handleResetPassword = () => {
  if (newPassword.value !== confirmNewPassword.value || newPassword.value.length < 8) return
  authHandlers.handleResetPassword({ recoveryToken: recoveryToken.value, newPassword: newPassword.value })
}
</script>

<style scoped>
.electron-drag { -webkit-app-region: drag; }
.electron-no-drag,
.electron-drag :deep(button),
.electron-drag :deep(a),
.electron-drag :deep(input),
.electron-drag :deep(select) { -webkit-app-region: no-drag; }
</style>

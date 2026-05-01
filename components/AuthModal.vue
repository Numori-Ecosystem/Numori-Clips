<template>
  <UiModal :show="isOpen" max-width="sm" :fullscreen-mobile="false" @close="$emit('close')">
    <div class="p-5">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-400 leading-none">
          {{ headerTitle }}
        </h2>
        <UiButton variant="ghost" color="gray" icon-only size="sm" @click="$emit('close')">
          <Icon name="mdi:close" class="block w-5 h-5" />
        </UiButton>
      </div>

      <!-- ═══ Login / Register ═══ -->
      <template v-if="step === 'auth'">
        <!-- Tab switcher -->
        <UiButtonsGroup
          variant="tabs"
          class="mb-4"
          :model-value="mode"
          :options="[
            { value: 'login', label: 'Sign In' },
            { value: 'register', label: 'Create Account' },
          ]"
          @update:model-value="switchMode($event)"
        />

        <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">
          {{
            mode === 'login'
              ? 'Sign in to sync your clips across devices.'
              : 'Signing up is optional. It enables cloud sync across devices.'
          }}
        </p>

        <UiAlert v-if="error" color="red" class="mb-3">{{ error }}</UiAlert>

        <form class="space-y-3" @submit.prevent="handleSubmit">
          <!-- Name (register only) -->
          <UiFormField v-if="mode === 'register'" label="Name">
            <UiInput
              v-model="name"
              type="text"
              autocomplete="name"
              placeholder="Your name (optional)"
              :validate="false"
            />
          </UiFormField>

          <UiFormField label="Email">
            <UiInput v-model="email" type="email" required autocomplete="email" placeholder="you@example.com" />
          </UiFormField>

          <div>
            <UiFormField label="Password">
              <UiInput
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
                :minlength="mode === 'register' ? 8 : undefined"
                placeholder="••••••••"
                :validate="false"
              />
            </UiFormField>
            <p v-if="mode === 'register'" class="text-xs text-gray-500 dark:text-gray-500 mt-1">
              At least 8 characters
            </p>
          </div>

          <!-- Confirm password (register only) -->
          <div v-if="mode === 'register'">
            <UiFormField label="Confirm Password">
              <UiInput
                v-model="confirmPassword"
                type="password"
                required
                autocomplete="new-password"
                :minlength="8"
                placeholder="••••••••"
                :validate="false"
              />
            </UiFormField>
            <p v-if="passwordMismatch" class="text-xs text-red-600 dark:text-red-400 mt-1">Passwords do not match</p>
          </div>

          <UiButton native-type="submit" :loading="loading" block>
            {{ mode === 'login' ? 'Sign In' : 'Create Account' }}
          </UiButton>
        </form>

        <!-- Forgot password link (login only) -->
        <p v-if="mode === 'login'" class="text-center text-xs text-gray-500 dark:text-gray-500 mt-3">
          <UiButton variant="link" color="primary" @click="startRecovery">Forgot password?</UiButton>
        </p>
      </template>

      <!-- ═══ Password Recovery: Enter Email ═══ -->
      <template v-else-if="step === 'recovery-email'">
        <UiAlert color="red" icon="mdi:database-remove-outline" bordered class="mb-4">
          <p class="text-xs text-red-700 dark:text-red-300 leading-relaxed">
            Password recovery will
            <span class="font-semibold">permanently delete all your encrypted clips</span>. They cannot be decrypted
            without the original password.
          </p>
        </UiAlert>

        <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">
          Enter your email address. If password recovery is enabled on your account, you'll receive a code.
        </p>

        <UiAlert v-if="error" color="red" class="mb-3">{{ error }}</UiAlert>

        <form class="space-y-3" @submit.prevent="handleForgotPassword">
          <UiFormField label="Email">
            <UiInput v-model="recoveryEmail" type="email" required placeholder="you@example.com" />
          </UiFormField>
          <UiButton native-type="submit" :loading="loading" block> Send Recovery Code </UiButton>
        </form>

        <p class="text-center text-xs text-gray-500 dark:text-gray-500 mt-3">
          <UiButton
            variant="link"
            color="primary"
            @click="step = 'auth'; mode = 'login'"
            >Back to sign in</UiButton
          >
        </p>
      </template>

      <!-- ═══ Password Recovery: Enter OTP ═══ -->
      <template v-else-if="step === 'recovery-otp'">
        <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">
          If your account has recovery enabled, a 6-digit code was sent to
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ recoveryEmail }}</span
          >.
        </p>

        <UiAlert v-if="error" color="red" class="mb-3">{{ error }}</UiAlert>

        <form class="space-y-3" @submit.prevent="handleVerifyRecovery">
          <UiFormField label="Verification Code">
            <UiInput
              v-model="otpCode"
              type="text"
              required
              :maxlength="6"
              pattern="[0-9]{6}"
              validation-pattern="^[0-9]{6}$"
              validation-message="Enter a 6-digit code"
              placeholder="000000"
            />
          </UiFormField>
          <UiButton native-type="submit" :disabled="loading || otpCode.length !== 6" :loading="loading" block>
            Verify Code
          </UiButton>
        </form>

        <p class="text-center text-xs text-gray-500 dark:text-gray-500 mt-3">
          <UiButton variant="link" color="primary" @click="step = 'recovery-email'">Use a different email</UiButton>
        </p>
      </template>

      <!-- ═══ Password Recovery: Set New Password ═══ -->
      <template v-else-if="step === 'recovery-newpass'">
        <!-- Prominent destruction warning -->
        <UiAlert color="red" icon="mdi:database-remove-outline" bordered size="md" class="mb-4">
          <p class="text-xs font-semibold text-red-800 dark:text-red-200">All your clips will be permanently deleted</p>
          <p class="text-xs text-red-700 dark:text-red-300 leading-relaxed">
            Your clips are encrypted with your current password. Resetting it means the encryption key is lost —
            <span class="font-semibold">every clip will be irreversibly destroyed</span>. This cannot be undone.
          </p>
        </UiAlert>

        <UiAlert v-if="error" color="red" class="mb-3">{{ error }}</UiAlert>

        <form class="space-y-3" @submit.prevent="handleResetPassword">
          <UiFormField label="New Password" hint="At least 8 characters">
            <UiInput
              v-model="newPassword"
              type="password"
              required
              :minlength="8"
              placeholder="••••••••"
              :validate="false"
            />
          </UiFormField>
          <div>
            <UiFormField label="Confirm New Password">
              <UiInput
                v-model="confirmNewPassword"
                type="password"
                required
                :minlength="8"
                placeholder="••••••••"
                :validate="false"
              />
            </UiFormField>
            <p
              v-if="confirmNewPassword && newPassword !== confirmNewPassword"
              class="text-xs text-red-600 dark:text-red-400 mt-1"
            >
              Passwords do not match
            </p>
          </div>
          <UiButton
            native-type="submit"
            color="red"
            :disabled="loading || !newPassword || newPassword.length < 8 || newPassword !== confirmNewPassword"
            :loading="loading"
            block
          >
            Reset Password &amp; Delete Clips
          </UiButton>
        </form>
      </template>
    </div>
  </UiModal>
</template>

<script setup>
const props = defineProps({
  isOpen: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
})

const emit = defineEmits(['close', 'login', 'register', 'forgot-password', 'verify-recovery', 'reset-password'])

const step = ref('auth') // 'auth' | 'recovery-email' | 'recovery-otp' | 'recovery-newpass'
const mode = ref('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const name = ref('')

// Recovery state
const recoveryEmail = ref('')
const otpCode = ref('')
const recoveryToken = ref(null)
const newPassword = ref('')
const confirmNewPassword = ref('')

const passwordMismatch = computed(() => {
  return mode.value === 'register' && confirmPassword.value && password.value !== confirmPassword.value
})

const headerTitle = computed(() => {
  switch (step.value) {
    case 'auth':
      return mode.value === 'login' ? 'Welcome Back' : 'Create Account'
    case 'recovery-email':
      return 'Recover Password'
    case 'recovery-otp':
      return 'Enter Code'
    case 'recovery-newpass':
      return 'New Password'
    default:
      return 'Sign In'
  }
})

const switchMode = (m) => {
  mode.value = m
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  name.value = ''
}

const resetAll = () => {
  step.value = 'auth'
  mode.value = 'login'
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  name.value = ''
  recoveryEmail.value = ''
  otpCode.value = ''
  recoveryToken.value = null
  newPassword.value = ''
  confirmNewPassword.value = ''
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) resetAll()
  },
)

const handleSubmit = () => {
  if (mode.value === 'register' && password.value !== confirmPassword.value) return
  if (mode.value === 'login') {
    emit('login', { email: email.value, password: password.value })
  } else {
    emit('register', { email: email.value, password: password.value, name: name.value })
  }
}

const startRecovery = () => {
  recoveryEmail.value = email.value || ''
  step.value = 'recovery-email'
}

const handleForgotPassword = () => {
  emit('forgot-password', {
    email: recoveryEmail.value,
    onSuccess: () => {
      step.value = 'recovery-otp'
      otpCode.value = ''
    },
  })
}

const handleVerifyRecovery = () => {
  emit('verify-recovery', {
    email: recoveryEmail.value,
    code: otpCode.value,
    onSuccess: (token) => {
      recoveryToken.value = token
      step.value = 'recovery-newpass'
    },
  })
}

const handleResetPassword = () => {
  if (newPassword.value !== confirmNewPassword.value || newPassword.value.length < 8) return
  emit('reset-password', {
    recoveryToken: recoveryToken.value,
    newPassword: newPassword.value,
  })
}
</script>

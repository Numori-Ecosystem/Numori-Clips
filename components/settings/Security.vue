<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:shield-lock-outline" title="Security" description="Session, app lock, and recovery settings" />

      <UiListMenu label="Session" preset="settings">
        <UiListMenuItem icon="mdi:timer-outline" hint="How long you stay logged in. Changes apply on next login." :select-ref="selectSessionDuration">
          Session Duration
          <template #suffix>
            <UiSelect ref="selectSessionDuration" :model-value="sessionDuration" :disabled="savingSessionDuration" :block="false" size="sm"
              :options="[{ value: 3600, label: '1 hour' },{ value: 86400, label: '1 day' },{ value: 604800, label: '7 days' },{ value: 2592000, label: '30 days' }]"
              @update:model-value="sessionDuration = $event; saveSessionDuration()" />
          </template>
        </UiListMenuItem>
      </UiListMenu>

      <!-- App Lock -->
      <UiListMenu label="App Lock" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:lock-outline" :hint="draft.enabled ? 'App is protected. Unlock required after timeout.' : 'Protect the app with a PIN, password, or biometrics.'" :toggle="draft.enabled" @update:toggle="draft.enabled = $event">
          App Lock
          <template #suffix><UiToggle :model-value="draft.enabled" size="sm" readonly /></template>
        </UiListMenuItem>
        <template v-if="draft.enabled">
          <UiListMenuItem icon="mdi:key-outline" :select-ref="selectLockMethod">
            Lock Method
            <template #suffix><UiSelect ref="selectLockMethod" :model-value="draft.method" :block="false" size="sm" :options="appLockMethodOptions" @update:model-value="onDraftMethodChange" /></template>
          </UiListMenuItem>
          <UiAlert v-if="showBiometricsChangeWarning" color="amber" icon="mdi:cellphone-remove" bordered size="md" class="my-2">
            <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Biometrics is active on another device — switching to {{ draft.method === 'pin' ? 'PIN' : 'password' }} here will disable it everywhere. To avoid this, use the biometrics fallback option instead.
            </p>
          </UiAlert>
          <div v-if="draft.method === 'biometrics' && appLockAvailableBiometrics.length > 1" class="px-4 py-2 space-y-1.5">
            <span class="text-xs text-gray-600 dark:text-gray-400">Biometric methods</span>
            <div class="flex flex-wrap gap-1.5">
              <UiButton v-for="bio in appLockAvailableBiometrics" :key="bio.id" variant="ghost" shape="pill" size="xs"
                :class="draft.selectedBiometrics.includes(bio.id) ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
                @click="toggleDraftBiometric(bio.id)">
                <Icon :name="bio.icon" class="w-3.5 h-3.5" /> {{ bio.label }}
              </UiButton>
            </div>
          </div>
          <div v-if="draftShowPin" class="px-4 py-2 space-y-1.5">
            <label class="text-xs text-gray-600 dark:text-gray-400">{{ draft.method === 'biometrics' ? 'Fallback PIN' : 'PIN' }} <span class="text-gray-400">(4 digits)</span></label>
            <UiInput :model-value="draft.pin" type="password" placeholder="Enter 4-digit PIN" :maxlength="4" inputmode="numeric" :validate="false" @update:model-value="draft.pin = $event.replace(/\D/g, '').slice(0, 4)" />
            <UiInput :model-value="draft.pinConfirm" type="password" placeholder="Confirm PIN" :maxlength="4" inputmode="numeric" :validate="false" @update:model-value="draft.pinConfirm = $event.replace(/\D/g, '').slice(0, 4)" />
            <p v-if="draft.pinConfirm && draft.pin !== draft.pinConfirm" class="text-xs text-red-600 dark:text-red-400">PINs do not match</p>
          </div>
          <div v-if="draftShowPassword" class="px-4 py-2 space-y-1.5">
            <label class="text-xs text-gray-600 dark:text-gray-400">{{ draft.method === 'biometrics' ? 'Fallback password' : 'Lock password' }}</label>
            <UiInput v-model="draft.password" type="password" placeholder="Enter lock password" :validate="false" />
            <UiInput v-model="draft.passwordConfirm" type="password" placeholder="Confirm password" :validate="false" />
            <p v-if="draft.passwordConfirm && draft.password !== draft.passwordConfirm" class="text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
          </div>
          <div v-if="draft.method === 'biometrics' || showBiometricsChangeWarning" class="relative">
            <Transition
              enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100"
              leave-active-class="transition-opacity duration-500" leave-from-class="opacity-100" leave-to-class="opacity-0"
            >
              <div v-if="fallbackGlow" class="absolute inset-0 z-10 pointer-events-none rounded-lg bg-primary-500/25 dark:bg-primary-400/20" />
            </Transition>
            <UiListMenuItem icon="mdi:key-variant" :select-ref="selectBiometricsFallback">
              Biometrics Fallback
              <template #suffix><UiSelect ref="selectBiometricsFallback" v-model="draft.biometricsFallback" :block="false" size="sm" :options="[{ value: 'pin', label: 'PIN' },{ value: 'password', label: 'Password' }]" /></template>
            </UiListMenuItem>
          </div>
          <UiAlert v-if="draft.method === 'biometrics' && biometricError" color="amber" icon="mdi:fingerprint-off" bordered size="md" class="my-2">
            <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{{ biometricError.message }}</p>
          </UiAlert>
          <UiListMenuItem icon="mdi:timer-sand" :select-ref="selectLockAfter">
            Lock After
            <template #suffix><UiSelect ref="selectLockAfter" v-model="draft.timeout" :block="false" size="sm" :options="[{ value: 0, label: 'Manual only' },{ value: 60, label: '1 minute' },{ value: 300, label: '5 minutes' },{ value: 900, label: '15 minutes' },{ value: 1800, label: '30 minutes' }]" /></template>
          </UiListMenuItem>
          <div class="flex gap-2 px-4 py-3">
            <UiButton variant="outline" color="gray" class="flex-1" size="sm" :disabled="!draftHasChanges" @click="resetDraft">Cancel</UiButton>
            <UiButton variant="solid" color="primary" class="flex-1" size="sm" :disabled="!canSaveAppLock" @click="saveAppLock">Save</UiButton>
          </div>
        </template>
      </UiListMenu>

      <!-- Privacy Screen -->
      <UiListMenu v-if="isNativePlatform" label="Privacy Screen" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:eye-off-outline" :hint="privacyScreenEnabled ? 'Content hidden in app switcher, screenshots blocked.' : 'Hide content in app switcher and prevent screenshots.'" :toggle="privacyScreenEnabled" :disabled="savingPrivacyScreen" @update:toggle="togglePrivacyScreen">
          Privacy Screen
          <template #suffix><UiToggle :model-value="privacyScreenEnabled" :disabled="savingPrivacyScreen" size="sm" readonly /></template>
        </UiListMenuItem>
      </UiListMenu>

      <!-- Password Recovery -->
      <UiListMenu label="Password Recovery" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:email-lock-outline" :hint="passwordRecoveryEnabled ? 'You can recover your account via email.' : 'Recovery disabled — store your password safely.'" :toggle="passwordRecoveryEnabled" :disabled="savingSecurity" @update:toggle="onPasswordRecoveryToggle">
          Recovery by Email
          <template #suffix><UiToggle :model-value="passwordRecoveryEnabled" :disabled="savingSecurity" size="sm" readonly /></template>
        </UiListMenuItem>
        <SettingsConfirmModal
          :is-open="confirmingRecoveryEnable"
          title="Enable Password Recovery?"
          icon="mdi:shield-alert-outline"
          confirm-label="Enable"
          confirm-color="amber"
          :loading="savingSecurity"
          @close="confirmingRecoveryEnable = false"
          @confirm="confirmPasswordRecovery"
        >
          Enabling password recovery makes your account recoverable via email, but anyone with email access could reset your password and delete your clips.
        </SettingsConfirmModal>
        <template v-if="passwordRecoveryEnabled">
          <UiAlert color="amber" icon="mdi:shield-alert-outline" bordered size="md" class="mx-4 mb-2">
            <p class="font-semibold text-amber-800 dark:text-amber-200">Account access risk</p>
            <p class="text-amber-700 dark:text-amber-300 leading-relaxed">Anyone with access to your email can trigger a password reset and take over your account.</p>
          </UiAlert>
          <UiAlert color="red" icon="mdi:database-remove-outline" bordered size="md" class="mx-4 mb-3">
            <p class="font-semibold text-red-800 dark:text-red-200">All clips destroyed on recovery</p>
            <p class="text-red-700 dark:text-red-300 leading-relaxed">A password reset means the encryption key is lost — <span class="font-semibold">all clips will be permanently deleted</span>.</p>
          </UiAlert>
        </template>
      </UiListMenu>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  user: { type: Object, default: null },
  authHeaders: { type: Object, default: () => ({}) },
})

const toast = useToast()
const { apiFetch } = useApi()
const { settings: appLockSettings, availableBiometrics: appLockAvailableBiometrics, biometricError, updateSettings: commitAppLock, disable: disableAppLock, detectBiometrics } = useAppLock()
const { enabled: privacyScreenEnabled, isNative: isNativePlatform, loadFromUser: loadPrivacyScreen, toggle: togglePrivacyScreenSetting } = usePrivacyScreen()

const selectSessionDuration = ref(null)
const selectLockMethod = ref(null)
const selectBiometricsFallback = ref(null)
const selectLockAfter = ref(null)

const sessionDuration = ref(604800)
const savingSessionDuration = ref(false)
const passwordRecoveryEnabled = ref(false)
const savingSecurity = ref(false)
const confirmingRecoveryEnable = ref(false)
const savingPrivacyScreen = ref(false)
const fallbackGlow = ref(false)

const draft = reactive({
  enabled: false, method: 'pin', pin: '', pinConfirm: '', password: '', passwordConfirm: '', timeout: 0, biometricsFallback: 'pin', selectedBiometrics: [],
})

const showFeedback = (msg, type = 'success') => {
  toast.show(msg, { type: type === 'error' ? 'error' : 'success', icon: type === 'error' ? 'mdi:alert-circle-outline' : 'mdi:check-circle-outline' })
}

const resetDraft = () => {
  draft.enabled = appLockSettings.enabled; draft.method = appLockSettings.method
  draft.pin = ''; draft.pinConfirm = ''; draft.password = ''; draft.passwordConfirm = ''
  draft.timeout = appLockSettings.timeout; draft.biometricsFallback = appLockSettings.biometricsFallback
  draft.selectedBiometrics = [...(appLockSettings.selectedBiometrics || [])]
}

const appLockMethodOptions = computed(() => {
  const opts = [{ value: 'pin', label: 'PIN' }, { value: 'password', label: 'Password' }]
  if (appLockAvailableBiometrics.value.length > 0) opts.push({ value: 'biometrics', label: 'Biometrics' })
  return opts
})

const draftShowPin = computed(() => draft.method === 'pin' || (draft.method === 'biometrics' && draft.biometricsFallback === 'pin'))
const draftShowPassword = computed(() => draft.method === 'password' || (draft.method === 'biometrics' && draft.biometricsFallback === 'password'))
const showBiometricsChangeWarning = computed(() => appLockSettings.method === 'biometrics' && draft.method !== 'biometrics' && appLockAvailableBiometrics.value.length === 0)

const draftHasChanges = computed(() => {
  if (draft.enabled !== appLockSettings.enabled) return true
  if (!draft.enabled) return false
  if (draft.method !== appLockSettings.method || draft.timeout !== appLockSettings.timeout || draft.biometricsFallback !== appLockSettings.biometricsFallback) return true
  if (JSON.stringify(draft.selectedBiometrics) !== JSON.stringify(appLockSettings.selectedBiometrics || [])) return true
  if (draftShowPin.value && draft.pin.length === 4 && draft.pin !== appLockSettings.pin) return true
  if (draftShowPassword.value && draft.password.length >= 1 && draft.password !== appLockSettings.password) return true
  return false
})

const canSaveAppLock = computed(() => {
  if (!draftHasChanges.value) return false
  if (!draft.enabled) return true
  if (draftShowPin.value) {
    const hasExisting = appLockSettings.pin?.length === 4
    const started = draft.pin.length > 0 || draft.pinConfirm.length > 0
    if (started) { if (draft.pin.length !== 4 || draft.pin !== draft.pinConfirm) return false } else if (!hasExisting) return false
  }
  if (draftShowPassword.value) {
    const hasExisting = appLockSettings.password?.length >= 1
    const started = draft.password.length > 0 || draft.passwordConfirm.length > 0
    if (started) { if (draft.password.length < 1 || draft.password !== draft.passwordConfirm) return false } else if (!hasExisting) return false
  }
  return true
})

const toggleDraftBiometric = (id) => {
  const idx = draft.selectedBiometrics.indexOf(id)
  if (idx >= 0) { if (draft.selectedBiometrics.length <= 1) return; draft.selectedBiometrics.splice(idx, 1) }
  else draft.selectedBiometrics.push(id)
}

const onDraftMethodChange = (method) => {
  draft.method = method
  if (method === 'biometrics') draft.selectedBiometrics = appLockAvailableBiometrics.value.map((b) => b.id)
  draft.pin = ''; draft.pinConfirm = ''; draft.password = ''; draft.passwordConfirm = ''
}

watch(() => draft.method, () => {
  if (showBiometricsChangeWarning.value) {
    fallbackGlow.value = false
    setTimeout(() => { fallbackGlow.value = true }, 100)
    setTimeout(() => { fallbackGlow.value = false }, 1100)
  }
})

const saveAppLock = async () => {
  if (!canSaveAppLock.value) return
  if (draftShowPin.value && draft.pin.length > 0 && draft.pin !== draft.pinConfirm) { showFeedback('PINs do not match', 'error'); return }
  if (draftShowPassword.value && draft.password.length > 0 && draft.password !== draft.passwordConfirm) { showFeedback('Passwords do not match', 'error'); return }
  try {
    if (!draft.enabled) { await disableAppLock(); showFeedback('App Lock disabled'); resetDraft(); return }
    const patch = { enabled: true, method: draft.method, timeout: draft.timeout, biometricsFallback: draft.biometricsFallback, selectedBiometrics: [...draft.selectedBiometrics] }
    if (draftShowPin.value && draft.pin.length === 4 && draft.pin === draft.pinConfirm) patch.pin = draft.pin
    if (draftShowPassword.value && draft.password.length >= 1 && draft.password === draft.passwordConfirm) patch.password = draft.password
    await commitAppLock(patch); showFeedback('App Lock settings saved'); resetDraft()
  } catch (err) { showFeedback(err?.data?.statusMessage || err?.message || 'Failed to save App Lock settings', 'error') }
}

const saveSessionDuration = async () => {
  savingSessionDuration.value = true
  try { await apiFetch('/api/auth/session-duration', { method: 'PUT', headers: props.authHeaders, body: { duration: Number(sessionDuration.value) } }); showFeedback('Session duration updated — takes effect on next login') }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to update session duration', 'error') }
  finally { savingSessionDuration.value = false }
}

const togglePrivacyScreen = async () => {
  savingPrivacyScreen.value = true
  try { const newVal = await togglePrivacyScreenSetting({ apiFetch, authHeaders: props.authHeaders }); showFeedback(newVal ? 'Privacy screen enabled' : 'Privacy screen disabled') }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to update privacy screen setting', 'error') }
  finally { savingPrivacyScreen.value = false }
}

const onPasswordRecoveryToggle = () => {
  const newVal = !passwordRecoveryEnabled.value
  if (newVal) { confirmingRecoveryEnable.value = true; return }
  savingSecurity.value = true
  apiFetch('/api/auth/security', { method: 'PUT', headers: props.authHeaders, body: { passwordRecoveryEnabled: false } })
    .then(() => { passwordRecoveryEnabled.value = false; showFeedback('Password recovery disabled') })
    .catch((err) => { showFeedback(err?.data?.statusMessage || 'Failed to update security setting', 'error') })
    .finally(() => { savingSecurity.value = false })
}

const confirmPasswordRecovery = async () => {
  confirmingRecoveryEnable.value = false; savingSecurity.value = true
  try { await apiFetch('/api/auth/security', { method: 'PUT', headers: props.authHeaders, body: { passwordRecoveryEnabled: true } }); passwordRecoveryEnabled.value = true; showFeedback('Password recovery enabled') }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to update security setting', 'error') }
  finally { savingSecurity.value = false }
}

let biometricPollTimer = null

const initFromUser = () => {
  passwordRecoveryEnabled.value = props.user?.passwordRecoveryEnabled === true
  sessionDuration.value = props.user?.sessionDuration || 604800
  loadPrivacyScreen(props.user)
  confirmingRecoveryEnable.value = false
  resetDraft()
}

onMounted(async () => {
  await detectBiometrics()
  initFromUser()
  biometricPollTimer = setInterval(() => detectBiometrics(), 5000)
})
watch(() => props.user, initFromUser)

onBeforeUnmount(() => {
  if (biometricPollTimer) { clearInterval(biometricPollTimer); biometricPollTimer = null }
})
</script>

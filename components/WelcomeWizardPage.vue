<!--
  Standalone Welcome Wizard page — rendered directly as window content (no modal).
  Used by the Electron wizard window.
-->
<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925">
    <!-- Title bar -->
    <div
      class="flex items-center px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-100 dark:bg-gray-900"
      :class="{ 'electron-drag': isElectron }"
    >
      <div
        v-if="isElectron"
        class="flex items-center gap-1.5 electron-no-drag group/traffic"
      >
        <button
          class="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none flex items-center justify-center"
          title="Close"
          @click="skip"
        >
          <Icon name="mdi:close" class="w-2.5 h-2.5 text-red-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
        </button>
        <button
          class="w-5 h-5 rounded-full bg-yellow-500 hover:bg-yellow-600 focus:outline-none flex items-center justify-center"
          title="Minimize"
          @click="handleMinimize"
        >
          <Icon name="mdi:minus" class="w-2.5 h-2.5 text-yellow-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
        </button>
      </div>
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-200 leading-none ml-2">
        Welcome
      </h2>
    </div>

    <!-- Progress dots -->
    <div class="pt-5 pb-2">
      <UiStepper v-model="step" :steps="totalSteps" />
    </div>

    <!-- Step content -->
    <div class="px-6 pb-2 pt-3 flex-1 flex flex-col items-center overflow-y-auto">
      <!-- Step 1: Welcome -->
      <div v-if="step === 1" class="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md">
        <div class="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-4">
          <Icon name="mdi:clipboard-text-outline" class="w-9 h-9 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome to Numori Clips</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm">
          Your clipboard, everywhere. Sync across all your devices with end-to-end encryption.
        </p>
      </div>

      <!-- Step 2: Extension setup (only if needed) -->
      <ExtensionSetup
        v-if="step === extensionStep"
        ref="extensionSetupRef"
        @continue="next"
        @status-changed="onExtensionStatusChanged"
      />

      <!-- Step: Theme & Language -->
      <div v-if="step === themeStep" class="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md">
        <div class="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-4">
          <Icon name="mdi:palette-outline" class="w-9 h-9 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Personalise</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-5">Pick a theme and language.</p>

        <div class="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
          <UiButton
            variant="outline" color="gray"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150"
            :class="currentTheme === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
            @click="setTheme('light')"
          >
            <Icon name="mdi:weather-sunny" class="w-8 h-8 text-amber-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Light</span>
          </UiButton>
          <UiButton
            variant="outline" color="gray"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150"
            :class="currentTheme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
            @click="setTheme('dark')"
          >
            <Icon name="mdi:weather-night" class="w-8 h-8 text-indigo-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Dark</span>
          </UiButton>
        </div>

        <div class="w-full max-w-xs text-left">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Language</label>
          <UiSelect
            :model-value="currentLocaleCode" searchable
            :options="availableLocales.map((l) => ({ value: l.code, label: getLanguageEmoji(l.code) + ' ' + l.name }))"
            @update:model-value="changeLocale($event)"
          />
        </div>
      </div>
    </div>

    <!-- Footer navigation -->
    <div class="px-6 pb-5 flex items-center w-full max-w-md mx-auto" :class="step === 1 ? 'justify-end' : 'justify-between'">
      <UiButton v-if="step > 1 && step !== extensionStep" variant="ghost" color="gray" @click="step--">Back</UiButton>
      <div v-else />
      <div class="flex items-center gap-3">
        <UiButton v-if="step < totalSteps && step !== extensionStep" variant="ghost" color="gray" @click="skip">Skip</UiButton>
        <UiButton v-if="step !== extensionStep" variant="solid" color="primary" @click="next">
          {{ step === totalSteps ? 'Get Started' : 'Next' }}
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup>
const { isElectron } = usePlatform()

const handleMinimize = () => globalThis.window?.electronAPI?.minimize()

const needsExtension = ref(false)
const extensionSetupRef = ref(null)

// Steps: 1=Welcome, 2=Extension (conditional), last=Theme
const extensionStep = computed(() => needsExtension.value ? 2 : -1) // -1 = skip
const themeStep = computed(() => needsExtension.value ? 3 : 2)
const totalSteps = computed(() => needsExtension.value ? 3 : 2)

const step = ref(1)

// Theme
const colorMode = useColorMode()
const currentTheme = computed(() => colorMode.value)
const setTheme = (theme) => { colorMode.preference = theme }

// Language
const { locale, locales, setLocale } = useI18n()
const availableLocales = computed(() => locales.value)
const currentLocaleCode = computed(() => locale.value)
const changeLocale = (code) => setLocale(code)
const getLanguageEmoji = (code) => {
  const map = { 'en-GB': '🇬🇧', 'en-US': '🇺🇸', 'es-ES': '🇪🇸', 'fr-FR': '🇫🇷', 'de-DE': '🇩🇪', 'ja-JP': '🇯🇵' }
  return map[code] || '🌐'
}

const onExtensionStatusChanged = (status) => {
  // If extension became working or not-needed, auto-advance
  if (status === 'working' || status === 'not-needed') {
    needsExtension.value = false
    step.value = themeStep.value
  }
}

const next = () => {
  if (step.value < totalSteps.value) step.value++
  else finish()
}

const skip = () => finish()

const finish = () => {
  step.value = 1
  globalThis.window?.electronAPI?.wizardComplete()
}

// Check extension status on mount
onMounted(async () => {
  if (globalThis.window?.electronAPI?.getExtensionStatus) {
    const status = await globalThis.window.electronAPI.getExtensionStatus()
    needsExtension.value = (status === 'not-installed' || status === 'installed-needs-restart')
  }
})
</script>

<style scoped>
.electron-drag {
  -webkit-app-region: drag;
}
.electron-no-drag,
.electron-drag :deep(button),
.electron-drag :deep(a),
.electron-drag :deep(input),
.electron-drag :deep(select),
.electron-drag :deep([role="listbox"]) {
  -webkit-app-region: no-drag;
}
</style>

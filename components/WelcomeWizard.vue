<!-- eslint-disable vue/no-mutating-props -->
<template>
  <UiModal :show="isOpen" max-width="lg" z="z-[60]" persistent>
    <!-- Progress dots -->
    <div class="pt-5 pb-2">
      <UiStepper v-model="step" :steps="totalSteps" />
    </div>

    <!-- Step content -->
    <div class="px-6 pb-2 pt-3 flex-1 flex flex-col items-center overflow-y-auto">
      <!-- Step 1: Welcome -->
      <div v-if="step === 1" class="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md">
        <div
          class="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-4"
        >
          <Icon
            name="mdi:clipboard-text-outline"
            class="w-9 h-9 text-primary-600 dark:text-primary-400"
          />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome to Numori Clips</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm">
          Your clipboard, everywhere. Sync across all your devices with end-to-end encryption.
        </p>
      </div>

      <!-- Step 2: Appearance -->
      <div v-if="step === 2" class="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md">
        <div
          class="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-4"
        >
          <Icon name="mdi:palette-outline" class="w-9 h-9 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Choose your look</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-5">Pick a theme that suits you.</p>

        <div class="grid grid-cols-2 gap-3 w-full max-w-xs">
          <UiButton
            variant="outline"
            color="gray"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150"
            :class="
              currentTheme === 'light'
                ? 'border-primary-500 bg-primary-50 dark:bg-gray-800'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            "
            @click="setTheme('light')"
          >
            <Icon name="mdi:weather-sunny" class="w-8 h-8 text-amber-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Light</span>
          </UiButton>
          <UiButton
            variant="outline"
            color="gray"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150"
            :class="
              currentTheme === 'dark'
                ? 'border-primary-500 bg-primary-50 dark:bg-gray-800'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            "
            @click="setTheme('dark')"
          >
            <Icon name="mdi:weather-night" class="w-8 h-8 text-indigo-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Dark</span>
          </UiButton>
        </div>
      </div>

      <!-- Step 3: Region & Language -->
      <div v-if="step === 3" class="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md">
        <div
          class="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-4"
        >
          <Icon name="mdi:earth" class="w-9 h-9 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Region &amp; Language
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Sets date formats and number styles.
        </p>

        <div class="w-full space-y-4 text-left">
          <!-- Region preset -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2"
              >Region Preset</label
            >
            <div class="grid grid-cols-3 gap-2">
              <UiButton
                v-for="(label, key) in presetLabels"
                :key="key"
                variant="outline"
                color="gray"
                class="border-2 transition-all duration-150"
                :class="
                  selectedPreset === key
                    ? 'bg-primary-50 dark:bg-gray-800 border-primary-500 dark:border-primary-400 text-primary-700 dark:text-primary-400'
                    : 'bg-gray-50 dark:bg-gray-925 border-transparent hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-400'
                "
                @click="selectPreset(key)"
              >
                {{ label }}
              </UiButton>
            </div>
          </div>

          <!-- Language -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2"
              >Language</label
            >
            <UiSelect
              :model-value="currentLocaleCode"
              searchable
              :options="
                availableLocales.map((l) => ({
                  value: l.code,
                  label: getLanguageEmoji(l.code) + ' ' + l.name,
                }))
              "
              @update:model-value="changeLocale($event)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Footer navigation -->
    <div
      class="px-6 pb-5 flex items-center w-full max-w-md mx-auto"
      :class="step === 1 ? 'justify-end' : 'justify-between'"
    >
      <UiButton v-if="step > 1" variant="ghost" color="gray" @click="step--"> Back </UiButton>
      <div class="flex items-center gap-3">
        <UiButton v-if="step < totalSteps" variant="ghost" color="gray" @click="skip">
          Skip
        </UiButton>
        <UiButton variant="solid" color="primary" @click="next">
          {{ step === totalSteps ? 'Get Started' : 'Next' }}
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

<script setup>
import { LOCALE_PRESETS } from '~/composables/useLocalePreferences'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  preferences: { type: Object, required: true },
  applyPreset: { type: Function, required: true },
  savePreferences: { type: Function, required: true },
})

const emit = defineEmits(['complete'])

const step = ref(1)
const totalSteps = 3

// Theme
const colorMode = useColorMode()
const currentTheme = computed(() => colorMode.value)
const setTheme = (theme) => {
  colorMode.preference = theme
}

// Region
const presetLabels = {
  UK: '🇬🇧 UK',
  US: '🇺🇸 US',
  ES: '🇪🇸 Spain',
  FR: '🇫🇷 France',
  DE: '🇩🇪 Germany',
  JP: '🇯🇵 Japan',
}
const presetLocaleMap = {
  UK: 'en-GB',
  US: 'en-GB',
  ES: 'es-ES',
  FR: 'en-GB',
  DE: 'en-GB',
  JP: 'en-GB',
}
const selectedPreset = ref('UK')

const selectPreset = (key) => {
  selectedPreset.value = key
  props.applyPreset(key)
  const targetLocale = presetLocaleMap[key]
  if (targetLocale && availableLocales.value.some((l) => l.code === targetLocale)) {
    setLocale(targetLocale)
  }
  props.savePreferences()
}

// Language
const { locale, locales, setLocale } = useI18n()
const availableLocales = computed(() => locales.value)
const currentLocaleCode = computed(() => locale.value)
const changeLocale = (code) => setLocale(code)
const getLanguageEmoji = (code) => {
  const map = {
    'en-GB': '🇬🇧',
    'en-US': '🇺🇸',
    'es-ES': '🇪🇸',
    'fr-FR': '🇫🇷',
    'de-DE': '🇩🇪',
    'ja-JP': '🇯🇵',
  }
  return map[code] || '🌐'
}

// Detect active preset on mount
onMounted(() => {
  for (const [name, preset] of Object.entries(LOCALE_PRESETS)) {
    const matches = Object.keys(preset).every((key) => props.preferences[key] === preset[key])
    if (matches) {
      selectedPreset.value = name
      break
    }
  }
})

// Navigation
const next = () => {
  if (step.value < totalSteps) {
    step.value++
  } else {
    finish()
  }
}

const skip = () => finish()

const finish = () => {
  step.value = 1
  emit('complete')
}
</script>

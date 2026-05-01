<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:earth" title="Locales" description="Region, language, and format preferences" />
      <UiListMenu label="Quick Preset" preset="settings">
        <div class="px-4 py-3">
          <p class="text-xs text-gray-400 dark:text-gray-500 mb-3">Apply a regional preset to set all locale options at once</p>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <button v-for="(_preset, name) in presets" :key="name" type="button"
              class="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium border-2 transition-all"
              :class="activePreset === name
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'bg-gray-50 dark:bg-gray-800/60 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'"
              @click="selectPreset(name)">
              <span class="text-lg leading-none">{{ presetEmojis[name] }}</span>
              <span>{{ name }}</span>
            </button>
          </div>
          <p v-if="activePreset === 'Custom'" class="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">Custom settings — doesn't match any preset</p>
        </div>
      </UiListMenu>
      <UiListMenu label="Language" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:translate" :select-ref="selectLocale">
          Display Language
          <template #suffix>
            <UiSelect ref="selectLocale" :model-value="currentLocaleCode" searchable
              :options="availableLocales.map((l) => ({ value: l.code, label: getLanguageEmoji(l.code) + ' ' + l.name }))"
              @update:model-value="changeLocale($event)" />
          </template>
        </UiListMenuItem>
      </UiListMenu>
      <UiListMenu label="Units" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:cup-water" :select-ref="selectVolume">
          Volume
          <template #suffix><UiSelect ref="selectVolume" :model-value="preferences.volume" :options="volumeOptions" @update:model-value="preferences.volume = $event; onSettingChange()" /></template>
        </UiListMenuItem>
        <UiListMenuItem icon="mdi:gas-station-outline" :select-ref="selectFuelEconomy">
          Fuel Economy
          <template #suffix><UiSelect ref="selectFuelEconomy" :model-value="preferences.fuelEconomy" :options="fuelEconomyOptions" @update:model-value="preferences.fuelEconomy = $event; onSettingChange()" /></template>
        </UiListMenuItem>
        <UiListMenuItem icon="mdi:map-marker-distance" :select-ref="selectDistance">
          Distance
          <template #suffix><UiSelect ref="selectDistance" :model-value="preferences.distance" :options="[{ value: 'km', label: 'Kilometres' }, { value: 'miles', label: 'Miles' }]" @update:model-value="preferences.distance = $event; onSettingChange()" /></template>
        </UiListMenuItem>
        <UiListMenuItem icon="mdi:thermometer" :select-ref="selectTemperature">
          Temperature
          <template #suffix><UiSelect ref="selectTemperature" :model-value="preferences.temperature" :options="[{ value: 'celsius', label: 'Celsius (°C)' }, { value: 'fahrenheit', label: 'Fahrenheit (°F)' }, { value: 'kelvin', label: 'Kelvin (K)' }]" @update:model-value="preferences.temperature = $event; onSettingChange()" /></template>
        </UiListMenuItem>
      </UiListMenu>
      <UiListMenu label="Formats" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:calendar-outline" :select-ref="selectDateFormat">
          Date Format
          <template #suffix><UiSelect ref="selectDateFormat" :model-value="preferences.dateFormat" :options="dateFormatOptions" @update:model-value="preferences.dateFormat = $event; onSettingChange()" /></template>
        </UiListMenuItem>
        <UiListMenuItem icon="mdi:clock-outline" :select-ref="selectTimeFormat">
          Time Format
          <template #suffix><UiSelect ref="selectTimeFormat" :model-value="preferences.timeFormat" :options="[{ value: '12h', label: '12-hour (3:30 PM)' }, { value: '24h', label: '24-hour (15:30)' }]" @update:model-value="preferences.timeFormat = $event; onSettingChange()" /></template>
        </UiListMenuItem>
        <UiListMenuItem icon="mdi:numeric" :select-ref="selectNumberFormat">
          Number Format
          <template #suffix><UiSelect ref="selectNumberFormat" :model-value="preferences.numberFormat" :options="numberFormatOptions" @update:model-value="preferences.numberFormat = $event; onSettingChange()" /></template>
        </UiListMenuItem>
      </UiListMenu>
    </div>
  </div>
</template>

<script setup>
import { LOCALE_PRESETS } from '~/composables/useLocalePreferences'

const props = defineProps({
  preferences: { type: Object, required: true },
  applyPreset: { type: Function, required: true },
  getActivePreset: { type: Function, required: true },
  save: { type: Function, required: true },
  onSettingChange: { type: Function, required: true },
})

const selectLocale = ref(null)
const selectVolume = ref(null)
const selectFuelEconomy = ref(null)
const selectDistance = ref(null)
const selectTemperature = ref(null)
const selectDateFormat = ref(null)
const selectTimeFormat = ref(null)
const selectNumberFormat = ref(null)

const presets = LOCALE_PRESETS
const presetEmojis = { UK: '🇬🇧', US: '🇺🇸', ES: '🇪🇸', FR: '🇫🇷', DE: '🇩🇪', JP: '🇯🇵' }
const presetLocaleMap = { UK: 'en-GB', US: 'en-GB', ES: 'es-ES', FR: 'en-GB', DE: 'en-GB', JP: 'en-GB' }
const activePreset = computed(() => props.getActivePreset())

const { locale, locales, setLocale } = useI18n()
const availableLocales = computed(() => locales.value)
const currentLocaleCode = computed(() => locale.value)
const changeLocale = (code) => setLocale(code)

const getLanguageEmoji = (code) => {
  const map = { 'en-GB': '🇬🇧', 'en-US': '🇺🇸', 'es-ES': '🇪🇸', 'fr-FR': '🇫🇷', 'de-DE': '🇩🇪', 'ja-JP': '🇯🇵', 'it-IT': '🇮🇹', 'pt-PT': '🇵🇹', 'pt-BR': '🇧🇷', 'zh-CN': '🇨🇳', 'ko-KR': '🇰🇷', 'ru-RU': '🇷🇺' }
  return map[code] || '🌐'
}

const selectPreset = (name) => {
  props.applyPreset(name)
  const targetLocale = presetLocaleMap[name]
  if (targetLocale && availableLocales.value.some((l) => l.code === targetLocale)) setLocale(targetLocale)
  props.save()
}

const volumeOptions = [
  { value: 'litre', label: 'Litres' },
  { value: 'us_gallon', label: 'US Gallons' },
  { value: 'uk_gallon', label: 'UK Gallons (Imperial)' },
]

const fuelEconomyOptions = [
  { value: 'mpg', label: 'Miles per gallon (US)' },
  { value: 'mpg_uk', label: 'Miles per gallon (UK)' },
  { value: 'kpl', label: 'Km per litre' },
  { value: 'l/100km', label: 'Litres per 100 km' },
  { value: 'mpl', label: 'Miles per litre' },
  { value: 'kpg', label: 'Km per gallon (US)' },
]

const dateFormatOptions = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

const numberFormatOptions = [
  { value: 'comma_dot', label: '1,000.00 (US/UK)' },
  { value: 'dot_comma', label: '1.000,00 (DE/ES)' },
  { value: 'space_comma', label: '1 000,00 (FR)' },
]
</script>

<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:format-font" title="Typography" description="Font, size, and text rendering" />
      <UiListMenu label="Font" preset="settings">
        <UiListMenuItem icon="mdi:format-font" hint="Custom fonts must be installed on your system" :select-ref="selectFontFamily">
          Font Family
          <template #suffix>
            <UiSelect ref="selectFontFamily" :model-value="preferences.editorFontFamily" :options="fontFamilyOptions" @update:model-value="preferences.editorFontFamily = $event; onSettingChange()" />
          </template>
        </UiListMenuItem>
        <UiListMenuItem icon="mdi:format-letter-matches" hint="Enable ligatures for supported fonts (e.g. Fira Code)" :toggle="preferences.editorLigatures" @update:toggle="preferences.editorLigatures = $event; onSettingChange()">
          Font Ligatures
          <template #suffix><UiToggle :model-value="preferences.editorLigatures" readonly /></template>
        </UiListMenuItem>
      </UiListMenu>
      <UiListMenu label="Size &amp; Spacing" preset="settings" class="mt-5">
        <div class="px-4 py-3 space-y-5">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2"><Icon name="mdi:format-size" class="w-4 h-4 text-gray-400 dark:text-gray-500" /><label class="text-sm text-gray-800 dark:text-gray-300">Font Size</label></div>
              <span class="text-sm font-medium text-primary-600 dark:text-primary-400 tabular-nums">{{ preferences.editorFontSize }}px</span>
            </div>
            <UiSlider v-model="preferences.editorFontSize" min="10" max="28" step="1" @input="onSettingChange" />
            <div class="flex justify-between text-[11px] text-gray-400 mt-1"><span>10px</span><span>28px</span></div>
          </div>
          <div class="border-t border-gray-100 dark:border-gray-700/40 pt-5">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2"><Icon name="mdi:format-line-spacing" class="w-4 h-4 text-gray-400 dark:text-gray-500" /><label class="text-sm text-gray-800 dark:text-gray-300">Line Height</label></div>
              <span class="text-sm font-medium text-primary-600 dark:text-primary-400 tabular-nums">{{ preferences.editorLineHeight }}px</span>
            </div>
            <UiSlider v-model="preferences.editorLineHeight" min="14" max="36" step="1" @input="onSettingChange" />
            <div class="flex justify-between text-[11px] text-gray-400 mt-1"><span>14px</span><span>36px</span></div>
          </div>
        </div>
      </UiListMenu>
    </div>
  </div>
</template>

<script setup>
defineProps({
  preferences: { type: Object, required: true },
  onSettingChange: { type: Function, required: true },
})

const selectFontFamily = ref(null)

const fontFamilyOptions = [
  { value: 'system', label: 'System Default' },
  { value: 'fira-code', label: 'Fira Code' },
  { value: 'jetbrains-mono', label: 'JetBrains Mono' },
  { value: 'source-code-pro', label: 'Source Code Pro' },
  { value: 'cascadia-code', label: 'Cascadia Code' },
  { value: 'ibm-plex-mono', label: 'IBM Plex Mono' },
]
</script>

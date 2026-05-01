<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:palette-outline" title="Appearance" description="Theme and display preferences" />
      <UiListMenu label="Theme" preset="settings">
        <UiListMenuItem icon="mdi:theme-light-dark" :select-ref="selectTheme">
          Color Theme
          <template #suffix>
            <UiSelect
              ref="selectTheme"
              :model-value="colorMode.preference"
              :options="themeOptions"
              @update:model-value="colorMode.preference = $event"
            />
          </template>
        </UiListMenuItem>
      </UiListMenu>
    </div>
  </div>
</template>

<script setup>
const colorMode = useColorMode()

const selectTheme = ref(null)

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
</script>

<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:tune-variant" title="General" description="Miscellaneous application settings" />
      <UiListMenu label="Setup" preset="settings">
        <UiListMenuItem icon="mdi:wizard-hat" hint="Show the first-time setup wizard again" clickable @click="emit('relaunch-wizard')">Relaunch Welcome Wizard</UiListMenuItem>
      </UiListMenu>
      <UiListMenu label="Updates" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:update" hint="How often to check for new versions" :select-ref="selectUpdateInterval">
          Check Interval
          <template #suffix>
            <UiSelect ref="selectUpdateInterval" :model-value="preferences.updateCheckInterval" :options="updateIntervalOptions" @update:model-value="preferences.updateCheckInterval = $event; onSettingChange()" />
          </template>
        </UiListMenuItem>
      </UiListMenu>
    </div>
  </div>
</template>

<script setup>
defineProps({
  preferences: { type: Object, required: true },
  onSettingChange: { type: Function, required: true },
})

const emit = defineEmits(['relaunch-wizard'])

const selectUpdateInterval = ref(null)

const updateIntervalOptions = [
  { value: 5, label: 'Every 5 min' },
  { value: 15, label: 'Every 15 min' },
  { value: 30, label: 'Every 30 min' },
  { value: 60, label: 'Every hour' },
  { value: 360, label: 'Every 6 hours' },
  { value: 0, label: 'Manual only' },
]
</script>

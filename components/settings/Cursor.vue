<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:cursor-text" title="Cursor &amp; Scrolling" description="Cursor appearance and scroll behaviour" />
      <UiListMenu label="Cursor" preset="settings">
        <UiListMenuItem icon="mdi:cursor-text" :select-ref="selectCursorStyle">
          Cursor Style
          <template #suffix>
            <UiSelect ref="selectCursorStyle" :model-value="preferences.editorCursorStyle" :options="[{ value: 'line', label: 'Line' }, { value: 'line-thin', label: 'Line (thin)' }]" @update:model-value="preferences.editorCursorStyle = $event; onSettingChange()" />
          </template>
        </UiListMenuItem>
      </UiListMenu>
      <UiListMenu label="Scrolling" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:arrow-expand-down" hint="Allow scrolling beyond the last line" :toggle="preferences.editorScrollPastEnd" @update:toggle="preferences.editorScrollPastEnd = $event; onSettingChange()">
          Scroll Past End
          <template #suffix><UiToggle :model-value="preferences.editorScrollPastEnd" readonly /></template>
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

const selectCursorStyle = ref(null)
</script>

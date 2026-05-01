<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:cog-outline" title="Behaviour" description="Auto-close, indentation, and bracket matching" />
      <UiListMenu label="Brackets &amp; Indentation" preset="settings">
        <UiListMenuItem icon="mdi:code-brackets" :select-ref="selectAutoCloseBrackets">
          Auto-close Brackets
          <template #suffix>
            <UiSelect ref="selectAutoCloseBrackets" :model-value="preferences.editorAutoClosingBrackets" :options="[{ value: 'always', label: 'Always' }, { value: 'never', label: 'Never' }]" @update:model-value="preferences.editorAutoClosingBrackets = $event; onSettingChange()" />
          </template>
        </UiListMenuItem>
        <UiListMenuItem icon="mdi:keyboard-tab">
          Tab Size
          <template #suffix>
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-primary-600 dark:text-primary-400 tabular-nums w-16 text-right">{{ preferences.editorTabSize }} spaces</span>
              <div class="w-24"><UiSlider v-model="preferences.editorTabSize" min="1" max="8" step="1" @input="onSettingChange" /></div>
            </div>
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

const selectAutoCloseBrackets = ref(null)
</script>

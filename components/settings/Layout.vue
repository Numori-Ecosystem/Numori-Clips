<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:page-layout-body" title="Layout" description="Editor chrome, gutters, and visual aids" />
      <UiListMenu label="Gutters" preset="settings">
        <UiListMenuItem icon="mdi:format-list-numbered" :select-ref="selectLineNumbers">
          Line Numbers
          <template #suffix>
            <UiSelect ref="selectLineNumbers" :model-value="preferences.editorLineNumbers" :options="lineNumberOptions" @update:model-value="preferences.editorLineNumbers = $event; onSettingChange()" />
          </template>
        </UiListMenuItem>
        <UiListMenuItem icon="mdi:format-color-highlight" :select-ref="selectLineHighlight">
          Line Highlight
          <template #suffix>
            <UiSelect ref="selectLineHighlight" :model-value="preferences.editorRenderLineHighlight" :options="lineHighlightOptions" @update:model-value="preferences.editorRenderLineHighlight = $event; onSettingChange()" />
          </template>
        </UiListMenuItem>
      </UiListMenu>
      <UiListMenu label="Text Display" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:wrap" hint="Wrap long lines to fit the editor width" :toggle="preferences.editorWordWrap" @update:toggle="preferences.editorWordWrap = $event; onSettingChange()">
          Word Wrap
          <template #suffix><UiToggle :model-value="preferences.editorWordWrap" readonly /></template>
        </UiListMenuItem>
        <UiListMenuItem icon="mdi:code-braces" hint="Allow collapsing code regions" :toggle="preferences.editorFolding" @update:toggle="preferences.editorFolding = $event; onSettingChange()">
          Code Folding
          <template #suffix><UiToggle :model-value="preferences.editorFolding" readonly /></template>
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

const selectLineNumbers = ref(null)
const selectLineHighlight = ref(null)

const lineNumberOptions = [
  { value: 'on', label: 'Absolute' },
  { value: 'relative', label: 'Relative' },
  { value: 'interval', label: 'Interval (every 10)' },
  { value: 'off', label: 'Off' },
]

const lineHighlightOptions = [
  { value: 'none', label: 'None' },
  { value: 'line', label: 'Line' },
  { value: 'all', label: 'Gutter + Line' },
]
</script>

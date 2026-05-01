<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:keyboard-outline" title="Shortcuts" description="Keyboard shortcuts and global hotkeys" />

      <UiListMenu label="Global Shortcuts" preset="settings">
        <UiListMenuItem icon="mdi:keyboard-outline" hint="Show/hide the clipboard panel from anywhere">
          Toggle Panel
          <template #suffix>
            <button
              class="px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all min-w-[120px] text-center"
              :class="recording === 'shortcutTogglePanel'
                ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 animate-pulse'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="startRecording('shortcutTogglePanel')"
            >
              {{ recording === 'shortcutTogglePanel' ? 'Press shortcut…' : (preferences.shortcutTogglePanel || 'Super+Shift+V') }}
            </button>
          </template>
        </UiListMenuItem>

        <UiListMenuItem icon="mdi:eye-off-outline" hint="Toggle incognito mode from anywhere">
          Toggle Incognito
          <template #suffix>
            <button
              class="px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all min-w-[120px] text-center"
              :class="recording === 'shortcutToggleIncognito'
                ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 animate-pulse'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="startRecording('shortcutToggleIncognito')"
            >
              {{ recording === 'shortcutToggleIncognito' ? 'Press shortcut…' : (preferences.shortcutToggleIncognito || 'Not set') }}
            </button>
          </template>
        </UiListMenuItem>
      </UiListMenu>

      <UiListMenu label="Behaviour" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:clipboard-text-outline" hint="Automatically paste after selecting a clip" :toggle="preferences.pasteOnSelect !== false" @update:toggle="preferences.pasteOnSelect = $event; onSettingChange()">
          Paste on Select
          <template #suffix><UiToggle :model-value="preferences.pasteOnSelect !== false" readonly /></template>
        </UiListMenuItem>

        <UiListMenuItem icon="mdi:volume-high" hint="Play a sound when a new clip is captured" :toggle="preferences.playSoundOnCopy === true" @update:toggle="preferences.playSoundOnCopy = $event; onSettingChange()">
          Sound on Copy
          <template #suffix><UiToggle :model-value="preferences.playSoundOnCopy === true" readonly /></template>
        </UiListMenuItem>

        <UiListMenuItem icon="mdi:magnify" hint="Keep the search text when the panel is hidden" :toggle="preferences.keepSearchOnHide === true" @update:toggle="preferences.keepSearchOnHide = $event; onSettingChange()">
          Keep Search on Hide
          <template #suffix><UiToggle :model-value="preferences.keepSearchOnHide === true" readonly /></template>
        </UiListMenuItem>
      </UiListMenu>

      <UiListMenu label="History" preset="settings" class="mt-5">
        <UiListMenuItem icon="mdi:history" hint="Maximum number of clips to keep" :select-ref="selectHistoryLength">
          History Length
          <template #suffix>
            <UiSelect ref="selectHistoryLength" :model-value="preferences.historyLength || 500" :options="historyLengthOptions" @update:model-value="preferences.historyLength = $event; onSettingChange()" />
          </template>
        </UiListMenuItem>
      </UiListMenu>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  preferences: { type: Object, required: true },
  onSettingChange: { type: Function, required: true },
})

const recording = ref(null)
const selectHistoryLength = ref(null)

const historyLengthOptions = [
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 200, label: '200' },
  { value: 500, label: '500' },
  { value: 1000, label: '1000' },
  { value: 2500, label: '2500' },
]

function applyShortcuts() {
  if (globalThis.window?.electronAPI?.updateShortcuts) {
    globalThis.window.electronAPI.updateShortcuts({
      togglePanel: props.preferences.shortcutTogglePanel || 'Super+Shift+V',
      toggleIncognito: props.preferences.shortcutToggleIncognito || null,
    })
  }
}

function startRecording(prefKey) {
  recording.value = prefKey

  const handler = (e) => {
    e.preventDefault()
    e.stopPropagation()

    // Ignore lone modifier keys
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

    const parts = []
    if (e.metaKey) parts.push('Super')
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')

    // Need at least one modifier for a global shortcut
    if (parts.length === 0) return

    let key = e.key
    if (key === ' ') key = 'Space'
    else if (key === 'Escape') {
      // Escape cancels recording
      recording.value = null
      document.removeEventListener('keydown', handler, true)
      return
    }
    else if (key.length === 1) key = key.toUpperCase()
    else if (key === 'Backspace') {
      // Backspace clears the shortcut
      props.preferences[prefKey] = ''
      props.onSettingChange()
      applyShortcuts()
      recording.value = null
      document.removeEventListener('keydown', handler, true)
      return
    }

    parts.push(key)
    const shortcut = parts.join('+')

    props.preferences[prefKey] = shortcut
    props.onSettingChange()
    applyShortcuts()

    recording.value = null
    document.removeEventListener('keydown', handler, true)
  }

  document.addEventListener('keydown', handler, true)

  // Cancel on click outside
  const cancel = () => {
    if (recording.value === prefKey) recording.value = null
    document.removeEventListener('keydown', handler, true)
  }
  setTimeout(() => {
    document.addEventListener('click', cancel, { once: true })
  }, 100)
}
</script>

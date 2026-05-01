<!--
  GNOME Shell extension setup prompt.
  Used in the welcome wizard and as a blocker when the extension is needed but not working.
-->
<template>
  <div class="flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
    <!-- Not installed -->
    <template v-if="status === 'not-installed'">
      <div class="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
        <Icon name="mdi:puzzle-outline" class="w-9 h-9 text-amber-600 dark:text-amber-400" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Helper Extension Required</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 max-w-sm">
        Numori Clips needs a small GNOME Shell extension to position its window correctly on multi-monitor setups with Wayland.
      </p>
      <UiButton variant="solid" color="primary" :loading="installing" @click="install">
        <Icon v-if="!installing" name="mdi:download" class="w-4 h-4" />
        Install Extension
      </UiButton>
      <p v-if="installError" class="text-xs text-red-600 dark:text-red-400 mt-3">{{ installError }}</p>
    </template>

    <!-- Installed but needs activation — trying to enable automatically -->
    <template v-else-if="status === 'installed-needs-restart'">
      <div class="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
        <Icon v-if="enabling" name="mdi:loading" class="w-9 h-9 text-amber-600 dark:text-amber-400 animate-spin" />
        <Icon v-else name="mdi:puzzle-outline" class="w-9 h-9 text-amber-600 dark:text-amber-400" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {{ enabling ? 'Activating Extension…' : 'Session Restart Required' }}
      </h2>
      <template v-if="!enabling">
        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2 max-w-sm">
          The extension is installed but couldn't be activated automatically. You need to log out and log back in to activate it.
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mb-6 max-w-sm">
          This is a GNOME requirement — new extensions only load when the session starts.
        </p>
        <UiButton variant="outline" color="gray" :loading="rechecking" @click="recheck">
          <Icon v-if="!rechecking" name="mdi:refresh" class="w-4 h-4" /> Re-check
        </UiButton>
      </template>
    </template>

    <!-- Working -->
    <template v-else-if="status === 'working'">
      <div class="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-4">
        <Icon name="mdi:check-circle" class="w-9 h-9 text-green-600 dark:text-green-400" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Extension Active</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 max-w-sm">
        The helper extension is installed and working.
      </p>
      <UiButton variant="solid" color="primary" @click="emit('continue')">
        Continue
      </UiButton>
    </template>

    <!-- Checking -->
    <template v-else>
      <Icon name="mdi:loading" class="w-8 h-8 text-gray-400 animate-spin mb-4" />
      <p class="text-sm text-gray-500">Checking extension status…</p>
    </template>
  </div>
</template>

<script setup>
const emit = defineEmits(['continue', 'status-changed'])

const status = ref('checking')
const installing = ref(false)
const installError = ref('')
const enabling = ref(false)
const rechecking = ref(false)

const api = () => globalThis.window?.electronAPI

const checkStatus = async () => {
  status.value = 'checking'
  if (!api()?.getExtensionStatus) {
    status.value = 'not-needed'
    emit('status-changed', status.value)
    return
  }
  const result = await api().getExtensionStatus()
  status.value = result
  emit('status-changed', result)
}

const install = async () => {
  installing.value = true
  installError.value = ''
  try {
    const success = await api().installGnomeExtension()
    if (success) {
      // After installing, try to enable it immediately
      enabling.value = true
      status.value = 'installed-needs-restart'
      emit('status-changed', status.value)

      await api().enableGnomeExtension()

      // Wait a moment for the extension to start
      await new Promise((r) => setTimeout(r, 1500))

      // Re-check if it's now working
      const newStatus = await api().getExtensionStatus()
      enabling.value = false
      status.value = newStatus
      emit('status-changed', newStatus)
    } else {
      installError.value = 'Installation failed. Please try manually.'
    }
  } catch {
    installError.value = 'Installation failed. Please try manually.'
    enabling.value = false
  } finally {
    installing.value = false
  }
}

const recheck = async () => {
  rechecking.value = true
  // Try enabling first in case user disabled it
  await api()?.enableGnomeExtension()
  await new Promise((r) => setTimeout(r, 1000))
  await checkStatus()
  rechecking.value = false
}

onMounted(() => checkStatus())

defineExpose({ status, checkStatus })
</script>

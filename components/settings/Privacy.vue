<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader
        icon="mdi:eye-lock-outline"
        title="Privacy"
        description="Control which apps are excluded from clipboard capture"
      />

      <!-- Ignored Apps -->
      <UiListMenu label="Ignored Apps" preset="settings">
        <div class="px-4 py-3">
          <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Clipboard content copied from these apps will not be captured.
            Enable an app to start filtering its clipboard activity.
          </p>
        </div>

        <!-- App list -->
        <div
          v-for="(app, index) in ignoredApps.apps.value"
          :key="index"
          class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700/40"
        >
          <UiCheckbox
            :model-value="app.enabled"
            size="sm"
            @update:model-value="ignoredApps.toggleApp(index)"
          />
          <span class="flex-1 min-w-0 truncate">{{ app.name }}</span>
          <button
            type="button"
            class="flex-shrink-0 p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Remove app"
            @click="confirmRemove(index)"
          >
            <Icon name="mdi:close" class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Empty state -->
        <div
          v-if="ignoredApps.apps.value.length === 0"
          class="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700/40"
        >
          <Icon name="mdi:shield-check-outline" class="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No apps in the ignore list</p>
        </div>

        <!-- Add new app -->
        <div class="px-4 py-3 border-t border-gray-100 dark:border-gray-700/40">
          <form class="flex gap-2" @submit.prevent="handleAddApp">
            <UiInput
              v-model="newAppName"
              placeholder="App name (e.g. Signal)"
              size="sm"
              class="flex-1"
              :validate="false"
            />
            <UiButton
              type="submit"
              variant="outline"
              color="primary"
              size="sm"
              :disabled="!newAppName.trim()"
            >
              <Icon name="mdi:plus" class="w-4 h-4 mr-1" />
              Add
            </UiButton>
          </form>
          <p v-if="addError" class="text-xs text-red-500 dark:text-red-400 mt-1.5">
            {{ addError }}
          </p>
        </div>
      </UiListMenu>

      <!-- Platform note -->
      <UiAlert
        v-if="isElectron"
        color="blue"
        icon="mdi:information-outline"
        bordered
        size="md"
        class="mt-5"
      >
        <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          App detection works by checking which application was in the foreground when content was copied.
          Names are matched loosely — "Bitwarden" will match "Bitwarden Desktop", "bitwarden", etc.
        </p>
      </UiAlert>

      <UiAlert
        v-if="!isElectron"
        color="amber"
        icon="mdi:alert-outline"
        bordered
        size="md"
        class="mt-5"
      >
        <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          App-based filtering requires the desktop app. On web and mobile, the browser cannot detect which app copied the content.
        </p>
      </UiAlert>
    </div>
  </div>
</template>

<script setup>
const ignoredApps = useIgnoredApps()
const toast = useToast()
const { isElectron } = usePlatform()

const newAppName = ref('')
const addError = ref('')

const handleAddApp = async () => {
  addError.value = ''
  const name = newAppName.value.trim()
  if (!name) return

  const added = await ignoredApps.addApp(name)
  if (added) {
    newAppName.value = ''
    toast.show(`"${name}" added to ignore list`, {
      type: 'success',
      icon: 'mdi:check-circle-outline',
    })
  } else {
    addError.value = `"${name}" is already in the list`
  }
}

const confirmRemove = async (index) => {
  const app = ignoredApps.apps.value[index]
  if (!app) return
  await ignoredApps.removeApp(index)
  toast.show(`"${app.name}" removed from ignore list`, {
    type: 'success',
    icon: 'mdi:check-circle-outline',
  })
}

onMounted(() => {
  ignoredApps.init()
})
</script>

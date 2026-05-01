<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925 overscroll-none">
    <!-- Checking extension status -->
    <div v-if="extensionBlocked === null" class="h-full flex items-center justify-center bg-white dark:bg-gray-925">
      <Icon name="mdi:loading" class="w-6 h-6 text-gray-400 animate-spin" />
    </div>

    <!-- Extension blocker — stays on index until resolved -->
    <div v-else-if="extensionBlocked" class="h-full flex flex-col bg-white dark:bg-gray-925">
      <ExtensionSetup @continue="recheckExtension" @status-changed="onExtensionStatus" />
    </div>

    <!-- Brief loading state while navigating away -->
    <div v-else class="h-full flex items-center justify-center bg-white dark:bg-gray-925">
      <Icon name="mdi:loading" class="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  </div>
</template>

<script setup>
const { isElectron } = usePlatform()
const router = useRouter()
const welcomeWizard = useWelcomeWizard()

const extensionBlocked = ref(null) // null = checking, true = blocked, false = ok

const onExtensionStatus = (status) => {
  extensionBlocked.value = (status === 'not-installed' || status === 'installed-needs-restart')
}

const recheckExtension = async () => {
  if (globalThis.window?.electronAPI?.getExtensionStatus) {
    const status = await globalThis.window.electronAPI.getExtensionStatus()
    extensionBlocked.value = (status === 'not-installed' || status === 'installed-needs-restart')
    if (!extensionBlocked.value) {
      globalThis.window?.electronAPI?.repositionMainWindow()
      navigateToClips()
    }
  } else {
    extensionBlocked.value = false
    navigateToClips()
  }
}

const navigateToClips = () => {
  router.replace('/clips')
}

onMounted(async () => {
  // Check if GNOME extension is needed but not working
  if (isElectron && globalThis.window?.electronAPI?.getExtensionStatus) {
    const extStatus = await globalThis.window.electronAPI.getExtensionStatus()
    if (extStatus === 'not-installed' || extStatus === 'installed-needs-restart') {
      extensionBlocked.value = true
      return
    }
    extensionBlocked.value = false
  } else {
    extensionBlocked.value = false
  }

  // Check if wizard needs to show
  await welcomeWizard.showIfFirstTime()
  if (welcomeWizard.isOpen.value) {
    welcomeWizard.isOpen.value = false
    if (isElectron) {
      globalThis.window?.electronAPI?.openWizardWindow()
    } else {
      router.replace('/wizard')
    }
    return
  }

  // All checks passed — navigate to clips
  navigateToClips()
})
</script>

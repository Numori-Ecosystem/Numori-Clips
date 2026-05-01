<!-- eslint-disable vue/no-mutating-props -->
<!--
  Standalone settings page — rendered directly as window content (no modal).
  Used by the Electron settings window. The SettingsModal component is left untouched
  and continues to be used on web/mobile.
-->
<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925">
    <!-- Title bar -->
    <div
      class="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-100 dark:bg-gray-900"
      :class="{ 'electron-drag': isElectron }"
    >
      <div class="flex items-center gap-2">
        <!-- Electron window controls -->
        <div
          v-if="isElectron"
          class="flex items-center gap-1.5 electron-no-drag group/traffic"
        >
          <button
            class="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none flex items-center justify-center"
            title="Close"
            @click="handleClose"
          >
            <Icon name="mdi:close" class="w-2.5 h-2.5 text-red-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
          </button>
          <button
            class="w-5 h-5 rounded-full bg-yellow-500 hover:bg-yellow-600 focus:outline-none flex items-center justify-center"
            title="Minimize"
            @click="handleMinimize"
          >
            <Icon name="mdi:minus" class="w-2.5 h-2.5 text-yellow-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
          </button>
          <button
            class="w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 focus:outline-none flex items-center justify-center"
            title="Maximize"
            @click="handleMaximize"
          >
            <Icon name="mdi:arrow-expand" class="w-2.5 h-2.5 text-green-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
          </button>
        </div>

        <UiButton
          v-if="!isElectron"
          variant="ghost"
          color="gray"
          icon-only
          class="hidden md:flex"
          title="Back"
          @click="handleClose"
        >
          <Icon name="mdi:arrow-left" class="block w-5 h-5" />
        </UiButton>

        <UiButton
          variant="ghost"
          color="gray"
          icon-only
          class="md:hidden"
          :title="activeSection ? 'Back' : 'Close'"
          @click="mobileBack"
        >
          <Icon :name="activeSection && isMobile ? 'mdi:arrow-left' : 'mdi:close'" class="block w-5 h-5" />
        </UiButton>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-200 leading-none">
          {{ activeSection && isMobile ? activeSectionLabel : 'Settings' }}
        </h2>
      </div>
    </div>

    <!-- Body: sidebar + content -->
    <div class="flex flex-1 overflow-hidden min-h-0">
      <!-- Sidebar navigation -->
      <nav
        v-show="!isMobile || (!activeSection && transitionState !== 'leaving')"
        class="flex-shrink-0 w-full md:w-60 h-full bg-gray-50 dark:bg-gray-900 md:border-r border-gray-200 dark:border-gray-800 flex flex-col"
      >
        <div class="p-3 pb-2 flex-shrink-0">
          <UiInput
            v-model="searchQuery"
            placeholder="Search settings..."
            icon-left="mdi:magnify"
            clearable
          />
        </div>
        <ul class="px-2 pb-3 space-y-0.5 overflow-y-auto flex-1 min-h-0">
          <template v-for="(section, idx) in filteredSections" :key="section.id">
            <li v-if="(section.id === 'profile' || section.id === 'sign-in') && idx > 0" class="py-1.5 px-3">
              <div class="border-t border-gray-200 dark:border-gray-700/50" />
            </li>
            <li>
              <button
                type="button"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left"
                :class="
                  activeSection === section.id
                    ? 'bg-primary-50 dark:bg-gray-800 text-primary-700 dark:text-primary-400 font-medium'
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850'
                "
                @click="selectSection(section.id)"
              >
                <Icon :name="section.icon" class="w-5 h-5 flex-shrink-0 opacity-70" />
                <div class="min-w-0">
                  <span class="block truncate">{{ section.label }}</span>
                  <span class="block text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {{ section.description }}
                  </span>
                </div>
              </button>
            </li>
          </template>
          <li
            v-if="searchQuery && filteredSections.length === 0"
            class="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500"
          >
            <Icon name="mdi:magnify" class="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No results for "{{ searchQuery }}"</p>
          </li>
        </ul>
      </nav>

      <!-- Content panel -->
      <div v-show="!isMobile || activeSection || transitionState === 'leaving'" ref="contentPanelRef" class="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-925">
        <div
          v-if="!activeSection && !isMobile"
          class="flex items-center justify-center h-full text-gray-400 dark:text-gray-500"
        >
          <div class="text-center">
            <Icon name="mdi:cog-outline" class="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p class="text-sm">Select a category</p>
          </div>
        </div>

        <div v-if="displayedSection" :class="sectionTransitionClasses">
          <SettingsGeneral v-if="displayedSection === 'general'" :preferences="preferences" :on-setting-change="onSettingChange" @relaunch-wizard="handleRelaunchWizard" />
          <SettingsAppearance v-else-if="displayedSection === 'appearance'" />
          <SettingsShortcuts v-else-if="displayedSection === 'shortcuts'" :preferences="preferences" :on-setting-change="onSettingChange" />
          <SettingsPrivacy v-else-if="displayedSection === 'privacy'" />
          <SettingsProfile v-else-if="displayedSection === 'profile'" ref="profileRef" :user="user" :auth-headers="authHeaders" @update-profile="emit('update-profile', $event)" @change-password="emit('change-password', $event)" @logout="emit('logout')" @navigate-section="selectSection" />
          <SettingsSecurity v-else-if="displayedSection === 'security'" :user="user" :auth-headers="authHeaders" />
          <SettingsSessions v-else-if="displayedSection === 'sessions'" :auth-headers="authHeaders" />
          <SettingsDangerZone v-else-if="displayedSection === 'danger'" :on-delete-data="onDeleteData" :on-delete-account="onDeleteAccount" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  initialSection: { type: String, default: null },
  preferences: { type: Object, required: true },
  save: { type: Function, required: true },
  user: { type: Object, default: null },
  authHeaders: { type: Object, default: () => ({}) },
  onDeleteData: { type: Function, default: null },
  onDeleteAccount: { type: Function, default: null },
})

const emit = defineEmits(['update-profile', 'change-password', 'logout'])

const { isElectron } = usePlatform()

const handleClose = () => {
  if (isElectron) globalThis.window?.electronAPI?.close()
  else navigateTo('/clips')
}

const handleMinimize = () => globalThis.window?.electronAPI?.minimize()
const handleMaximize = () => globalThis.window?.electronAPI?.maximize()

const handleRelaunchWizard = () => {
  if (isElectron) {
    globalThis.window?.electronAPI?.openWizardWindow()
    globalThis.window?.electronAPI?.close()
  } else {
    navigateTo('/wizard')
  }
}

// ── Child refs ──
const profileRef = ref(null)

// ── Navigation state ──
const activeSection = ref(null)
const displayedSection = ref(null)
const slideDirection = ref('down')
const searchQuery = ref('')
const isMobile = ref(false)
const contentPanelRef = ref(null)

const checkMobile = () => { isMobile.value = window.innerWidth < 768 }

const isLoggedIn = computed(() => !!props.user)

const appSections = [
  { id: 'general', label: 'General', icon: 'mdi:tune-variant', description: 'App settings', keywords: 'general welcome wizard relaunch setup update check interval version' },
  { id: 'appearance', label: 'Appearance', icon: 'mdi:palette-outline', description: 'Theme & display', keywords: 'appearance theme dark light mode color' },
  { id: 'shortcuts', label: 'Shortcuts', icon: 'mdi:keyboard-outline', description: 'Hotkeys & behaviour', keywords: 'shortcut keyboard hotkey toggle panel incognito paste sound history' },
  { id: 'privacy', label: 'Privacy', icon: 'mdi:shield-eye-outline', description: 'Ignored apps', keywords: 'privacy ignore app filter password manager bitwarden clipboard exclude block' },
]

const accountSections = [
  { id: 'profile', label: 'Profile', icon: 'mdi:account-circle-outline', description: 'Account info', keywords: 'profile account name email avatar photo' },
  { id: 'security', label: 'Security', icon: 'mdi:shield-lock-outline', description: 'Lock & recovery', keywords: 'security session app lock pin password biometrics recovery privacy screen' },
  { id: 'sessions', label: 'Sessions', icon: 'mdi:devices', description: 'Active devices', keywords: 'sessions devices logged in active' },
  { id: 'danger', label: 'Danger Zone', icon: 'mdi:alert-outline', description: 'Delete data', keywords: 'danger delete account data reset destroy' },
]

const signInSection = { id: 'sign-in', label: 'Sign In / Sign Up', icon: 'mdi:login', description: 'Create or access your account', keywords: 'sign in sign up login register account' }

const sections = computed(() => {
  if (isLoggedIn.value) return [...appSections, ...accountSections]
  return [...appSections, signInSection]
})

const onSettingChange = () => props.save()

const activeSectionLabel = computed(() => {
  const s = sections.value.find((s) => s.id === activeSection.value)
  return s ? s.label : 'Settings'
})

const filteredSections = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sections.value
  return sections.value.filter((s) => s.label.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q))
})

watch(filteredSections, (filtered) => {
  if (searchQuery.value && filtered.length === 1) activeSection.value = filtered[0].id
})

const selectSection = (id) => {
  // Sign-in is a special action — navigate to auth page
  if (id === 'sign-in') {
    if (isElectron) {
      globalThis.window?.electronAPI?.openAuthWindow()
    } else {
      navigateTo('/auth')
    }
    return
  }

  if (id === activeSection.value) return
  if (profileRef.value?.subSection) profileRef.value.subSection = null

  if (isMobile.value && activeSection.value) {
    slideDirection.value = sectionIndex(id) > sectionIndex(activeSection.value) ? 'right' : 'left'
    transitionState.value = 'leaving'
    const enterDir = slideDirection.value
    setTimeout(() => {
      activeSection.value = id
      displayedSection.value = id
      if (contentPanelRef.value) contentPanelRef.value.scrollTop = 0
      slideDirection.value = enterDir
      transitionState.value = 'entering-start'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          transitionState.value = 'entering'
          setTimeout(() => { transitionState.value = 'idle' }, 200)
        })
      })
    }, 200)
  } else {
    activeSection.value = id
  }

  searchQuery.value = ''
}

const sectionIndex = (id) => sections.value.findIndex((s) => s.id === id)

const transitionState = ref('idle')
const mobileGoingBack = ref(false)

watch(activeSection, (newId, oldId) => {
  const mobile = isMobile.value

  if (mobile) {
    const goingBack = mobileGoingBack.value
    mobileGoingBack.value = false

    if (!oldId && newId) {
      slideDirection.value = 'right'
      displayedSection.value = newId
      transitionState.value = 'entering-start'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          transitionState.value = 'entering'
          setTimeout(() => { transitionState.value = 'idle' }, 200)
        })
      })
      return
    }
    if (oldId && !newId && goingBack) {
      slideDirection.value = 'left'
      transitionState.value = 'leaving'
      setTimeout(() => {
        displayedSection.value = null
        transitionState.value = 'idle'
      }, 200)
      return
    }
  }

  if (!oldId || !newId) {
    displayedSection.value = newId
    transitionState.value = 'idle'
    return
  }
  slideDirection.value = sectionIndex(newId) > sectionIndex(oldId) ? 'down' : 'up'
  transitionState.value = 'leaving'
  setTimeout(() => {
    displayedSection.value = newId
    if (contentPanelRef.value) contentPanelRef.value.scrollTop = 0
    transitionState.value = 'entering-start'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        transitionState.value = 'entering'
        setTimeout(() => { transitionState.value = 'idle' }, 200)
      })
    })
  }, 150)
}, { immediate: true })

const sectionTransitionClasses = computed(() => {
  const dir = slideDirection.value
  const mobile = isMobile.value

  if (mobile && (dir === 'right' || dir === 'left')) {
    switch (transitionState.value) {
      case 'leaving': return dir === 'left'
        ? 'transition-all duration-200 ease-in opacity-0 translate-x-8'
        : 'transition-all duration-200 ease-in opacity-0 -translate-x-8'
      case 'entering-start': return dir === 'right'
        ? 'opacity-0 translate-x-8'
        : 'opacity-0 -translate-x-8'
      case 'entering': return 'transition-all duration-200 ease-out opacity-100 translate-x-0'
      default: return 'opacity-100 translate-x-0'
    }
  }

  switch (transitionState.value) {
    case 'leaving': return dir === 'down' ? 'transition-all duration-150 ease-in opacity-0 -translate-y-4' : 'transition-all duration-150 ease-in opacity-0 translate-y-4'
    case 'entering-start': return dir === 'down' ? 'opacity-0 translate-y-4' : 'opacity-0 -translate-y-4'
    case 'entering': return 'transition-all duration-200 ease-out opacity-100 translate-y-0'
    default: return 'opacity-100 translate-y-0'
  }
})

const mobileBack = () => {
  if (profileRef.value?.subSection) { profileRef.value.subSection = null; return }
  if (activeSection.value && isMobile.value) { mobileGoingBack.value = true; activeSection.value = null } else { handleClose() }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  const target = props.initialSection || (isMobile.value ? null : 'general')
  activeSection.value = target
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.electron-drag {
  -webkit-app-region: drag;
}
.electron-no-drag,
.electron-drag :deep(button),
.electron-drag :deep(a),
.electron-drag :deep(input),
.electron-drag :deep(select),
.electron-drag :deep([role="menu"]),
.electron-drag :deep([role="listbox"]) {
  -webkit-app-region: no-drag;
}
</style>

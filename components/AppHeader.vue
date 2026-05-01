<template>
  <header
    class="bg-gray-100 dark:bg-gray-900 flex-shrink-0"
    :class="{ 'electron-drag': isElectron }"
    :style="{
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
    }"
  >
    <div class="flex items-center gap-1.5 px-3 py-1.5">
      <!-- Left: App title -->
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <h1 class="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-200 truncate">
          Numori Clips
        </h1>
      </div>

      <!-- Center spacer -->
      <div class="flex-1" />

      <!-- Right: Theme + Settings + User -->
      <div class="flex items-center gap-1">
        <ThemeSwitcher />

        <UiButton
          variant="ghost"
          color="gray"
          icon-only
          title="Settings"
          @click="$emit('show-settings')"
        >
          <Icon name="mdi:cog-outline" class="w-4.5 h-4.5 block" />
        </UiButton>
      </div>

      <!-- User avatar dropdown -->
      <UiDropdown ref="avatarDropdownRef" align="right" width="w-64">
        <template #trigger="{ toggle }">
          <button
            class="flex-shrink-0 w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-0 flex items-center justify-center"
            @click="toggle"
          >
            <UiAvatar
              v-if="isLoggedIn"
              :src="user?.avatarUrl"
              size="lg"
            />
            <UiAvatar
              v-else
              size="lg"
              color="gray"
              fallback-icon="mdi:account-circle-outline"
            />
          </button>
        </template>

        <div class="py-1">
          <template v-if="isLoggedIn">
            <UiButton variant="menu-item" class="px-4" @click="avatarAction('edit-profile')">
              <Icon name="mdi:account-edit-outline" class="w-4 h-4" />
              Edit Profile
            </UiButton>
          </template>

          <UiDivider class="my-1" />

          <UiButton variant="menu-item" class="px-4" @click="avatarAction('show-settings-sessions')">
            <Icon name="mdi:devices" class="w-4 h-4" />
            Sessions
          </UiButton>
          <UiButton variant="menu-item" class="px-4" @click="avatarAction('show-settings-security')">
            <Icon name="mdi:shield-lock-outline" class="w-4 h-4" />
            Security
          </UiButton>

          <UiDivider class="my-1" />

          <UiButton variant="menu-item" class="px-4" @click="avatarAction('show-settings')">
            <Icon name="mdi:cog-outline" class="w-4 h-4" />
            Settings
          </UiButton>

          <UiDivider class="my-1 mb-3" />

          <!-- Sign out / Lock (logged in) or Sign In / Sign Up (logged out) -->
          <template v-if="isLoggedIn">
            <UiDropdownRow>
              <UiButton
                v-if="appLockEnabled"
                variant="menu-item"
                class="flex-1 justify-center"
                @click="avatarAction('lock-app')"
              >
                <Icon name="mdi:lock" class="w-4 h-4" />
                Lock
              </UiButton>
              <UiDivider v-if="appLockEnabled" direction="vertical" />
              <UiButton
                variant="menu-item"
                color="red"
                class="flex-1 justify-center"
                @click="avatarAction('logout')"
              >
                <Icon name="mdi:logout" class="w-4 h-4" />
                Sign Out
              </UiButton>
            </UiDropdownRow>
          </template>
          <template v-else>
            <UiDropdownRow>
              <UiButton
                variant="menu-item"
                class="flex-1 justify-center"
                @click="avatarAction('show-auth')"
              >
                <Icon name="mdi:login" class="w-4 h-4" />
                Sign In / Sign Up
              </UiButton>
            </UiDropdownRow>
          </template>
        </div>
      </UiDropdown>
    </div>
  </header>
</template>

<script setup>
const { isElectron } = usePlatform()

defineProps({
  isLoggedIn: {
    type: Boolean,
    default: false,
  },
  user: {
    type: Object,
    default: null,
  },
  appLockEnabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'edit-profile',
  'show-auth',
  'show-settings',
  'show-settings-security',
  'show-settings-sessions',
  'lock-app',
  'logout',
])

const avatarDropdownRef = ref(null)

const avatarAction = (action) => {
  avatarDropdownRef.value?.close()
  emit(action)
}
</script>

<style scoped>
.electron-drag {
  -webkit-app-region: drag;
}
.electron-drag :deep(button),
.electron-drag :deep(a),
.electron-drag :deep(input),
.electron-drag :deep(select),
.electron-drag :deep([role="menu"]),
.electron-drag :deep([role="listbox"]) {
  -webkit-app-region: no-drag;
}
</style>

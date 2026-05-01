<template>
  <!--
    Electron: render content directly — no backdrop, no teleport.
    The content fills the BrowserWindow it lives in.
  -->
  <template v-if="isElectron">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 bg-white dark:bg-gray-925 flex flex-col overflow-hidden"
        :class="[panelClass]"
      >
        <slot />
      </div>
    </Transition>
  </template>

  <!--
    Web / Mobile: delegate to UiModal for overlay + backdrop behaviour.
    This keeps the existing UX on non-Electron platforms.
  -->
  <UiModal
    v-else
    :show="show"
    :max-width="maxWidth"
    :fullscreen-mobile="fullscreenMobile"
    :persistent="persistent"
    :panel-class="panelClass"
    :z="z"
    :padding="padding"
    @close="$emit('close')"
  >
    <slot />
  </UiModal>
</template>

<script setup>
/**
 * UiWindow — Platform-aware window container.
 *
 * On Electron each "window" (settings, auth, wizard, etc.) is already its own
 * BrowserWindow, so wrapping content in a teleported backdrop overlay is wrong —
 * it adds a pointless dimmed layer and fights the native window chrome.
 *
 * On web / mobile the component delegates to UiModal so the existing overlay +
 * backdrop + transition behaviour is preserved.
 *
 * Drop-in replacement for UiModal when the content represents a full window
 * rather than a dialog or prompt.
 *
 * @example Electron-aware settings window
 * <UiWindow :show="isOpen" max-width="5xl" @close="close">
 *   <SettingsContent />
 * </UiWindow>
 *
 * @example Small window (auth)
 * <UiWindow :show="isOpen" max-width="sm" :fullscreen-mobile="false" @close="close">
 *   <AuthForm />
 * </UiWindow>
 *
 * @emits {void} close — Emitted when the window should close (backdrop click on web, or programmatic)
 *
 * @slot default — Window content
 */
const { isElectron } = usePlatform()

defineProps({
  /** Controls window visibility. */
  show: { type: Boolean, default: false },

  /**
   * Maximum width preset (used on web/mobile only — Electron fills the BrowserWindow).
   * @values 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
   */
  maxWidth: { type: String, default: 'sm' },

  /** Whether the window goes fullscreen on mobile viewports (web/mobile only). */
  fullscreenMobile: { type: Boolean, default: true },

  /** Persistent mode — prevents closing when clicking the backdrop (web/mobile only). */
  persistent: { type: Boolean, default: false },

  /** Additional CSS classes applied to the panel element. */
  panelClass: { type: String, default: '' },

  /** Z-index class (web/mobile only). */
  z: { type: String, default: 'z-50' },

  /** Padding class around the panel (web/mobile only). */
  padding: { type: String, default: 'md:p-4' },
})

defineEmits(['close'])
</script>

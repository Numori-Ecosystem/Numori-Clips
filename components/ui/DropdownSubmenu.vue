<template>
  <!-- Hover-triggered on desktop, click-triggered on mobile -->
  <div
    class="relative"
    @mouseenter="!isMobile && (showSub = true)"
    @mouseleave="!isMobile && (showSub = false)"
  >
    <UiButton variant="menu-item" :disabled="disabled" @click="showSub = !showSub">
      <Icon :name="icon" class="w-4 h-4 block flex-shrink-0" />
      <span class="flex-1 text-left">{{ label }}</span>
      <Icon
        :name="isMobile ? (showSub ? 'mdi:chevron-up' : 'mdi:chevron-down') : 'mdi:chevron-right'"
        class="w-3.5 h-3.5 block flex-shrink-0 text-gray-400"
      />
    </UiButton>

    <!-- Mobile: inline accordion with left border accent -->
    <Transition
      enter-active-class="transition-all duration-100 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-60 opacity-100"
      leave-active-class="transition-all duration-75 ease-in"
      leave-from-class="max-h-60 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div
        v-if="showSub && !disabled && isMobile"
        class="overflow-hidden bg-gray-50 dark:bg-gray-850 border-l-2 border-primary-400 ml-5"
      >
        <slot />
      </div>
    </Transition>

    <!-- Desktop: flyout panel positioned left or right -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showSub && !disabled && !isMobile"
        class="absolute top-0 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50"
        :class="alignLeft ? 'right-full mr-1' : 'left-full ml-1'"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup>
/**
 * UiDropdownSubmenu — Nested submenu for UiDropdown with responsive behavior.
 *
 * On desktop (≥640px), shows a flyout panel on hover to the left or right.
 * On mobile (<640px), expands inline as an accordion with a left border accent.
 * Automatically detects viewport width on mount and resize.
 *
 * @example Basic submenu
 * <UiDropdownSubmenu icon="mdi:format-text" label="Text Style">
 *   <UiDropdownItem icon="mdi:format-bold" label="Bold" @click="bold" />
 *   <UiDropdownItem icon="mdi:format-italic" label="Italic" @click="italic" />
 * </UiDropdownSubmenu>
 *
 * @example Left-aligned flyout
 * <UiDropdownSubmenu icon="mdi:share" label="Share" align-left>
 *   <UiDropdownItem icon="mdi:email" label="Email" @click="shareEmail" />
 * </UiDropdownSubmenu>
 *
 * @slot default — Submenu items (typically UiDropdownItem components)
 *
 * @see UiDropdown — Parent dropdown container
 * @see UiDropdownItem — Standard menu item for use inside this submenu
 */
defineProps({
  /**
   * MDI icon name displayed at the start of the trigger row.
   * @type {string}
   * @required
   */
  icon: { type: String, required: true },

  /**
   * Text label for the submenu trigger.
   * @type {string}
   * @required
   */
  label: { type: String, required: true },

  /**
   * Disabled state — prevents opening the submenu.
   * @type {boolean}
   * @default false
   */
  disabled: { type: Boolean, default: false },

  /**
   * Align the desktop flyout to the left (right-to-left) instead of the default right.
   * @type {boolean}
   * @default false
   */
  alignLeft: { type: Boolean, default: false },
})

const showSub = ref(false)
// Track viewport width to switch between mobile accordion and desktop flyout
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 640
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

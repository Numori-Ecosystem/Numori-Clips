<template>
  <!-- Circular avatar container with image or fallback icon -->
  <div
    class="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
    :class="[sizeClass, bgClass, ringClass]"
  >
    <img v-if="src" :src="src" :alt="alt" class="w-full h-full object-cover" >
    <Icon v-else :name="fallbackIcon" :class="iconSizeClass" />
  </div>
</template>

<script setup>
/**
 * UiAvatar — Circular avatar component displaying an image or a fallback icon.
 *
 * When a `src` URL is provided, renders a cover-fit image. Otherwise, displays
 * a configurable fallback icon on a colored background. Supports five sizes,
 * two color themes for the fallback state, and an optional ring border.
 *
 * @example Image avatar
 * <UiAvatar src="/img/user.jpg" alt="Jane Doe" size="lg" />
 *
 * @example Fallback icon avatar with ring
 * <UiAvatar size="md" color="primary" ring />
 *
 * @example Small gray avatar with custom icon
 * <UiAvatar size="sm" color="gray" fallback-icon="mdi:account-group" />
 */
const props = defineProps({
  /**
   * Image source URL. When empty, the fallback icon is shown.
   * @type {string}
   * @default ''
   */
  src: { type: String, default: '' },

  /**
   * Alt text for the avatar image (accessibility).
   * @type {string}
   * @default 'Avatar'
   */
  alt: { type: String, default: 'Avatar' },

  /**
   * Avatar size controlling width, height, and icon dimensions.
   * @type {string}
   * @default 'md'
   * @values 'xs' (24px) | 'sm' (32px) | 'md' (36px) | 'lg' (48px) | 'xl' (64px)
   */
  size: { type: String, default: 'md' },

  /**
   * MDI icon name used when no image src is provided.
   * @type {string}
   * @default 'mdi:account'
   */
  fallbackIcon: { type: String, default: 'mdi:account' },

  /**
   * Background color theme for the fallback icon state.
   * @type {string}
   * @default 'primary'
   * @values 'primary' | 'gray'
   */
  color: { type: String, default: 'primary' },

  /**
   * Show a ring border around the avatar for emphasis.
   * @type {boolean}
   * @default false
   */
  ring: { type: Boolean, default: false },
})

const sizeClass = computed(() => {
  const map = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-9 h-9', lg: 'w-12 h-12', xl: 'w-16 h-16' }
  return map[props.size] || map.md
})

const iconSizeClass = computed(() => {
  const map = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6', xl: 'w-8 h-8' }
  return map[props.size] || map.md
})

// Only apply background color when showing the fallback icon (not when an image is loaded)
const bgClass = computed(() => {
  if (props.src) return ''
  const map = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    gray: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  }
  return map[props.color] || map.primary
})

const ringClass = computed(() =>
  props.ring ? 'ring-2 ring-primary-200 dark:ring-primary-800 shadow-sm' : '',
)
</script>

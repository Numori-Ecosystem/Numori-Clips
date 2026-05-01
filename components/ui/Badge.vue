<template>
  <!-- Inline pill badge with optional leading icon -->
  <span :class="classes">
    <Icon v-if="icon" :name="icon" :class="iconSizeClass" class="flex-shrink-0" />
    <slot />
  </span>
</template>

<script setup>
/**
 * UiBadge — Inline pill-shaped badge with color themes, sizes, and optional icon.
 *
 * Renders a small rounded-full label suitable for status indicators, tags, or counts.
 * Supports five color themes and three sizes. An optional leading icon is sized
 * proportionally to the badge size.
 *
 * @example Primary badge
 * <UiBadge>New</UiBadge>
 *
 * @example Red badge with icon
 * <UiBadge color="red" icon="mdi:alert-circle">Error</UiBadge>
 *
 * @example Medium green badge
 * <UiBadge color="green" size="md">Active</UiBadge>
 *
 * @slot default — Badge text or content
 */
const props = defineProps({
  /**
   * Color theme for the badge background and text.
   * @type {string}
   * @default 'primary'
   * @values 'primary' | 'gray' | 'red' | 'green' | 'amber'
   */
  color: { type: String, default: 'primary' },

  /**
   * Badge size controlling padding and font size.
   * @type {string}
   * @default 'xs'
   * @values 'xs' | 'sm' | 'md'
   */
  size: { type: String, default: 'xs' },

  /**
   * Optional MDI icon name displayed before the slot content.
   * @type {string}
   * @default ''
   */
  icon: { type: String, default: '' },
})

const classes = computed(() => {
  const base = 'inline-flex items-center gap-1 rounded-full font-medium'
  const sizeMap = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }
  const colorMap = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
    gray: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  }
  return `${base} ${sizeMap[props.size] || sizeMap.xs} ${colorMap[props.color] || colorMap.primary}`
})

// Icon dimensions scale with badge size for visual balance
const iconSizeClass = computed(() => {
  const map = { xs: 'w-3 h-3', sm: 'w-3.5 h-3.5', md: 'w-4 h-4' }
  return map[props.size] || map.xs
})
</script>

<template>
  <kbd :class="classes">
    <slot />
  </kbd>
</template>

<script setup>
/**
 * UiKbd — Keyboard shortcut badge for displaying key combinations.
 *
 * Renders a styled `<kbd>` element with monospace font and subtle background,
 * matching the app's light/dark theme. Used in help screens and shortcut hints.
 *
 * @example Single key
 * <UiKbd>Enter</UiKbd>
 *
 * @example Key combination
 * <UiKbd>Ctrl+S</UiKbd>
 *
 * @example Extra-small size for inline hints
 * <UiKbd size="xs">⌘</UiKbd>
 *
 * @slot default — Key text or combination to display
 */
const props = defineProps({
  /**
   * Size variant controlling padding and font size.
   * @type {string}
   * @default 'sm'
   * @values 'xs' | 'sm'
   */
  size: { type: String, default: 'sm' },
})

const classes = computed(() => {
  const base = 'bg-gray-100 dark:bg-gray-800 rounded font-mono text-gray-900 dark:text-gray-400'
  const sizeMap = {
    xs: 'px-1 py-0.5 text-[10px] leading-none',
    sm: 'px-3 py-1 text-sm',
  }
  return `${base} ${sizeMap[props.size] || sizeMap.sm}`
})
</script>

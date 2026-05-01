<template>
  <div
    v-if="direction === 'vertical'"
    class="flex-shrink-0"
    :class="[verticalClasses, colorClass]"
  />
  <div v-else :class="[horizontalClasses, colorClass]" />
</template>

<script setup>
/**
 * UiDivider — Visual separator line for menus, toolbars, and content sections.
 *
 * Renders a thin line either horizontally (full-width border-top) or vertically
 * (1px-wide column). Supports three color presets matching common usage contexts.
 *
 * @example Horizontal menu divider
 * <UiDivider />
 *
 * @example Vertical toolbar separator
 * <UiDivider direction="vertical" />
 *
 * @example Darker divider
 * <UiDivider color="medium" />
 */
const props = defineProps({
  /**
   * Divider orientation.
   * @type {string}
   * @default 'horizontal'
   * @values 'horizontal' | 'vertical'
   */
  direction: { type: String, default: 'horizontal' },

  /**
   * Color intensity preset.
   * - 'light': subtle (gray-100/gray-700) — dropdown menus
   * - 'medium': standard (gray-200/gray-700) — context menus, content sections
   * - 'dark': stronger (gray-300/gray-600) — account menus, prominent separators
   * @type {string}
   * @default 'light'
   * @values 'light' | 'medium' | 'dark'
   */
  color: { type: String, default: 'light' },
})

const horizontalClasses = 'border-t my-1'

const verticalClasses = 'w-px h-5 mx-1'

const colorClass = computed(() => {
  if (props.direction === 'vertical') {
    const map = {
      light: 'bg-gray-300/60 dark:bg-gray-700',
      medium: 'bg-gray-300/60 dark:bg-gray-700',
      dark: 'bg-gray-300 dark:bg-gray-600',
    }
    return map[props.color] || map.light
  }
  const map = {
    light: 'border-gray-100 dark:border-gray-700',
    medium: 'border-gray-200 dark:border-gray-700',
    dark: 'border-gray-300 dark:border-gray-600',
  }
  return map[props.color] || map.light
})
</script>

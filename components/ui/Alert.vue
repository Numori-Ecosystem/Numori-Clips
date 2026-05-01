<template>
  <div :class="[containerClasses, bordered ? borderClass : '']" role="alert">
    <div v-if="icon || $slots.icon" :class="hasBody ? 'flex gap-2' : 'flex items-center gap-2'">
      <slot name="icon">
        <Icon
          v-if="icon"
          :name="icon"
          :class="[iconClasses, hasBody ? 'mt-0.5' : '']"
          class="flex-shrink-0"
        />
      </slot>
      <div class="flex-1 min-w-0">
        <slot />
      </div>
    </div>
    <template v-else>
      <slot />
    </template>
  </div>
</template>

<script setup>
/**
 * UiAlert — Inline alert/callout box for errors, warnings, success, and info messages.
 *
 * Renders a rounded box with colored background, optional leading icon, and optional
 * border. Supports four color themes and two sizes. Content is passed via the default
 * slot for maximum flexibility (plain text, rich HTML, or structured layouts).
 *
 * @example Simple error message
 * <UiAlert color="red">Something went wrong.</UiAlert>
 *
 * @example Warning with icon and border
 * <UiAlert color="amber" icon="mdi:alert-outline" bordered>
 *   <p class="font-semibold">Warning</p>
 *   <p>This action cannot be undone.</p>
 * </UiAlert>
 *
 * @example Success feedback
 * <UiAlert color="green" icon="mdi:check-circle">Saved successfully.</UiAlert>
 *
 * @example Compact error (xs size)
 * <UiAlert color="red" size="xs">Invalid email address</UiAlert>
 *
 * @slot default — Alert content (plain text, rich HTML, or structured layouts)
 * @slot icon — Custom icon element (replaces the icon prop)
 */
const props = defineProps({
  /**
   * Color theme for background and text.
   * @type {string}
   * @default 'red'
   * @values 'red' | 'amber' | 'green' | 'blue' | 'gray'
   */
  color: { type: String, default: 'red' },

  /**
   * Optional MDI icon name displayed at the start.
   * @type {string}
   * @default ''
   */
  icon: { type: String, default: '' },

  /**
   * Show a colored border around the alert.
   * @type {boolean}
   * @default false
   */
  bordered: { type: Boolean, default: false },

  /**
   * Size preset controlling padding and font size.
   * @type {string}
   * @default 'sm'
   * @values 'xs' (compact, text-xs) | 'sm' (standard, text-xs) | 'md' (spacious, text-sm)
   */
  size: { type: String, default: 'sm' },
})

const slots = useSlots()
// Detect if slot has multiple elements (structured body) for icon alignment
const hasBody = computed(() => {
  const children = slots.default?.()
  return children && children.length > 1
})

const containerClasses = computed(() => {
  const sizeMap = {
    xs: 'px-3 py-2 rounded-lg text-xs',
    sm: 'px-3 py-2 rounded-lg text-xs',
    md: 'px-3 py-2.5 rounded-lg text-sm',
  }
  const colorMap = {
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    gray: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  }
  return `${sizeMap[props.size] || sizeMap.sm} ${colorMap[props.color] || colorMap.red}`
})

const borderClass = computed(() => {
  const map = {
    red: 'border border-red-300 dark:border-red-800',
    amber: 'border border-amber-200 dark:border-amber-800',
    green: 'border border-green-300 dark:border-green-800',
    blue: 'border border-blue-300 dark:border-blue-800',
    gray: 'border border-gray-200 dark:border-gray-700',
  }
  return map[props.color] || map.red
})

const iconClasses = computed(() => {
  const sizeMap = { xs: 'w-3.5 h-3.5', sm: 'w-4 h-4', md: 'w-5 h-5' }
  const colorMap = {
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    gray: 'text-gray-500 dark:text-gray-400',
  }
  return `${sizeMap[props.size] || sizeMap.sm} ${colorMap[props.color] || colorMap.red}`
})
</script>

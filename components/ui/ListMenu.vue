<template>
  <div>
    <!-- Optional section label above the list -->
    <p
      v-if="label"
      class="font-medium uppercase tracking-wider mb-1.5"
      :class="[labelSizeClass, labelColorClass, labelPaddingClass]"
    >
      {{ label }}
    </p>
    <div
      class="divide-y"
      :class="[shapeClass, containerClass, childRadiusClass]"
    >
      <slot />
    </div>
  </div>
</template>

<script setup>
/**
 * UiListMenu — Grouped list container for UiListMenuItem rows.
 *
 * A versatile container for grouped rows of any kind: clickable actions,
 * settings with toggles/selects, informational rows, or mixed content.
 * Supports an optional uppercase section label, a danger (red) color scheme,
 * and visual presets for different contexts.
 *
 * @example Action list
 * <UiListMenu label="Account">
 *   <UiListMenuItem icon="mdi:account" clickable>Profile</UiListMenuItem>
 *   <UiListMenuItem icon="mdi:lock" clickable>Security</UiListMenuItem>
 * </UiListMenu>
 *
 * @example Settings panel preset with mixed content
 * <UiListMenu label="Display" preset="settings">
 *   <UiListMenuItem icon="mdi:translate" label="Language">
 *     <template #suffix><UiSelect ... /></template>
 *   </UiListMenuItem>
 *   <UiListMenuItem icon="mdi:wrap" label="Word Wrap">
 *     <template #suffix><UiToggle ... /></template>
 *   </UiListMenuItem>
 * </UiListMenu>
 *
 * @example Danger zone
 * <UiListMenu label="Danger Zone" danger>
 *   <UiListMenuItem icon="mdi:trash-can" danger clickable>Delete Account</UiListMenuItem>
 * </UiListMenu>
 *
 * @slot default — List items (typically UiListMenuItem components)
 *
 * @see UiListMenuItem — Row item designed for use inside this list
 */
const props = defineProps({
  /**
   * Section label displayed above the list in uppercase.
   * @type {string}
   * @default ''
   */
  label: { type: String, default: '' },

  /**
   * Use danger/red styling for the container border, background, and label.
   * @type {boolean}
   * @default false
   */
  danger: { type: Boolean, default: false },

  /**
   * Border radius preset for the container.
   * @type {string}
   * @default 'xl'
   * @values 'xl' | 'lg' | 'none'
   */
  rounded: { type: String, default: 'xl' },

  /**
   * Visual preset that adjusts container styling for different contexts.
   * - 'default' — Standard bordered list with gray background
   * - 'settings' — White bg, subtle border, inset label — ideal for settings panels
   * @type {string}
   * @default 'default'
   * @values 'default' | 'settings'
   */
  preset: { type: String, default: 'default' },
})

const shapeClass = computed(() => {
  const map = { xl: 'rounded-xl', lg: 'rounded-lg', none: '' }
  return map[props.rounded] ?? map.xl
})

const childRadiusClass = computed(() => {
  const map = {
    xl: '[&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl',
    lg: '[&>*:first-child]:rounded-t-lg [&>*:last-child]:rounded-b-lg',
    none: '',
  }
  return map[props.rounded] ?? map.xl
})

const containerClass = computed(() => {
  if (props.danger) {
    return 'bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 divide-red-100 dark:divide-red-900/30'
  }
  const presetMap = {
    default: 'bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 divide-gray-100 dark:divide-gray-800',
    settings: 'bg-white dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/50 divide-gray-100 dark:divide-gray-700/40',
  }
  return presetMap[props.preset] ?? presetMap.default
})

const labelSizeClass = computed(() => {
  const map = { default: 'text-[10px]', settings: 'text-[11px]' }
  return map[props.preset] ?? map.default
})

const labelPaddingClass = computed(() => {
  const map = { default: 'px-1', settings: 'px-1' }
  return map[props.preset] ?? map.default
})

const labelColorClass = computed(() => {
  if (props.danger) return 'text-red-400 dark:text-red-600'
  return 'text-gray-400 dark:text-gray-500'
})
</script>

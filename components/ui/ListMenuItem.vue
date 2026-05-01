<template>
  <component
    :is="isInteractive ? 'button' : 'div'"
    :type="isInteractive ? 'button' : undefined"
    class="w-full flex items-center gap-3 text-sm text-left transition-colors"
    :class="[sizeClass, colorClass]"
    :disabled="isInteractive ? disabled : undefined"
    @click="handleClick"
  >
    <Icon
      v-if="icon"
      :name="icon"
      class="flex-shrink-0"
      :class="[iconSizeClass, iconClass || defaultIconColorClass]"
    />
    <span class="flex-1 min-w-0">
      <span class="block truncate"><slot /></span>
      <span v-if="hint" class="block text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{{ hint }}</span>
    </span>
    <div class="flex-shrink-0 flex items-center" @click.stop="handleSuffixClick">
      <slot name="suffix">
        <Icon
          v-if="clickable && chevron"
          name="mdi:chevron-right"
          class="w-4 h-4"
          :class="danger ? 'text-red-300 dark:text-red-800' : 'text-gray-300 dark:text-gray-600'"
        />
      </slot>
    </div>
  </component>
</template>

<script setup>
/**
 * UiListMenuItem — Single row item for use inside UiListMenu.
 *
 * A versatile row component that can serve as:
 * - A clickable action row (set `clickable`)
 * - A toggle row where tapping anywhere toggles (set `toggle`)
 * - A select row where tapping anywhere opens the select (set `selectRef`)
 * - A static row hosting suffix controls (default)
 *
 * @example Clickable action row
 * <UiListMenuItem icon="mdi:account" clickable @click="goProfile">Profile</UiListMenuItem>
 *
 * @example Toggle row (whole row is tappable)
 * <UiListMenuItem icon="mdi:wrap" :toggle="wordWrap" @update:toggle="wordWrap = $event">
 *   Word Wrap
 *   <template #suffix><UiToggle :model-value="wordWrap" readonly /></template>
 * </UiListMenuItem>
 *
 * @example Select row (whole row opens the select)
 * <UiListMenuItem icon="mdi:translate" :select-ref="langRef">
 *   Language
 *   <template #suffix><UiSelect ref="langRef" ... /></template>
 * </UiListMenuItem>
 *
 * @emits {void} click — Emitted when a clickable item is clicked
 * @emits {boolean} update:toggle — Emitted with the new value when a toggle row is tapped
 *
 * @slot default — Label text
 * @slot suffix — Trailing content (toggle, select, badge, etc.)
 *
 * @see UiListMenu — Parent container for grouping list items
 */
const props = defineProps({
  /** MDI icon name displayed at the start of the row. */
  icon: { type: String, default: '' },

  /** Custom CSS class override for the icon element. */
  iconClass: { type: String, default: '' },

  /** Whether this item is a clickable action (renders as button with hover states + chevron). */
  clickable: { type: Boolean, default: false },

  /**
   * Toggle state. When set to a boolean, the row becomes a tappable toggle.
   * Clicking anywhere emits `update:toggle` with the inverted value.
   */
  toggle: { type: Boolean, default: undefined },

  /**
   * Reference to a UiSelect component instance. When provided, the row becomes
   * tappable and clicking anywhere opens the select dropdown.
   */
  selectRef: { type: Object, default: undefined },

  /** Show a chevron-right icon as the trailing suffix (only when clickable). */
  chevron: { type: Boolean, default: true },

  /** Danger/red styling for destructive actions. */
  danger: { type: Boolean, default: false },

  /** Disabled state — dims the item and prevents interaction. */
  disabled: { type: Boolean, default: false },

  /** Optional hint text displayed below the label. */
  hint: { type: String, default: '' },

  /**
   * Size preset for padding and icon dimensions.
   * @values 'md' | 'sm'
   */
  size: { type: String, default: 'md' },
})

const emit = defineEmits(['click', 'update:toggle'])

const isToggle = computed(() => props.toggle !== undefined)
const isSelect = computed(() => props.selectRef !== undefined)
const isInteractive = computed(() => props.clickable || isToggle.value || isSelect.value)

const handleClick = () => {
  if (props.disabled) return
  if (isToggle.value) {
    emit('update:toggle', !props.toggle)
  } else if (isSelect.value) {
    props.selectRef?.toggle?.()
  } else if (props.clickable) {
    emit('click')
  }
}

const handleSuffixClick = (e) => {
  // For toggle rows, clicking the suffix (the toggle itself) should also toggle
  if (isToggle.value && !props.disabled) {
    e.stopPropagation()
    emit('update:toggle', !props.toggle)
    return
  }
  // For select rows, let the select handle its own click (it calls toggleOpen)
  // but stop propagation so the row doesn't double-open
  if (isSelect.value) {
    e.stopPropagation()
    return
  }
  // For clickable rows, stop propagation so suffix controls work independently
  if (props.clickable) {
    e.stopPropagation()
  }
}

const sizeClass = computed(() => {
  const map = { md: 'px-4 py-3', sm: 'px-3 py-2.5' }
  return map[props.size] ?? map.md
})

const iconSizeClass = computed(() => {
  const map = { md: 'w-[18px] h-[18px]', sm: 'w-4 h-4' }
  return map[props.size] ?? map.md
})

const defaultIconColorClass = computed(() => {
  if (props.danger) return 'text-red-500 dark:text-red-400'
  return 'text-gray-400 dark:text-gray-500'
})

const colorClass = computed(() => {
  if (props.disabled) return 'opacity-40 cursor-not-allowed'
  if (!isInteractive.value) {
    return props.danger
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-700 dark:text-gray-300'
  }
  if (props.danger) return 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 cursor-pointer'
  return 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 active:bg-gray-100 dark:active:bg-gray-700/60 cursor-pointer'
})
</script>

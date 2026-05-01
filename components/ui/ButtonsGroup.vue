<template>
  <!-- Segmented button group rendered as a flex row with role="group" -->
  <div :class="[wrapperClass, containerClass]" role="group">
    <UiButton
      v-for="(opt, idx) in options"
      :key="opt.value"
      variant="ghost"
      :icon-only="!opt.label"
      :size="buttonSize"
      :class="[
        roundingClass(idx),
        modelValue === opt.value ? activeClass : inactiveClass,
        opt.label ? 'flex-1' : '',
      ]"
      :title="opt.title || opt.label || ''"
      @click="$emit('update:modelValue', opt.value)"
    >
      <Icon v-if="opt.icon" :name="opt.icon" :class="iconClass" class="block" />
      <span v-if="opt.label">{{ opt.label }}</span>
    </UiButton>
  </div>
</template>

<script setup>
/**
 * UiButtonsGroup — Segmented toggle button group for single-select options.
 *
 * Renders a row of UiButton elements styled as a connected group (toolbar or tabs).
 * Only one option can be active at a time (radio-like behavior via v-model).
 * Supports icon-only toolbar mode and text-based tab mode with automatic sizing,
 * rounding, and active/inactive styling.
 *
 * @example Toolbar with icons
 * <UiButtonsGroup v-model="view" :options="[
 *   { value: 'grid', icon: 'mdi:view-grid' },
 *   { value: 'list', icon: 'mdi:view-list' },
 * ]" />
 *
 * @example Tab-style text group
 * <UiButtonsGroup v-model="tab" variant="tabs" :options="[
 *   { value: 'all', label: 'All' },
 *   { value: 'active', label: 'Active' },
 *   { value: 'archived', label: 'Archived' },
 * ]" />
 *
 * @emits {string | number | boolean} update:modelValue — Emitted when an option is selected
 *
 * @see UiButton — Underlying button component used for each option
 */
const props = defineProps({
  /**
   * Currently selected option value (v-model).
   * @type {string | number | boolean}
   * @default ''
   */
  modelValue: { type: [String, Number, Boolean], default: '' },

  /**
   * Array of option objects: `{ value, icon?, label?, title? }`.
   * At least `value` is required. Provide `icon` for toolbar mode, `label` for tabs.
   * @type {Array<{ value: string|number, icon?: string, label?: string, title?: string }>}
   * @required
   */
  options: { type: Array, required: true },

  /**
   * Visual style of the group.
   * - 'toolbar': compact icon toggles with gray background
   * - 'tabs': text-based tabs with lighter background and smaller buttons
   * @type {string}
   * @default 'toolbar'
   * @values 'toolbar' | 'tabs'
   */
  variant: { type: String, default: 'toolbar' },

  /**
   * Icon size class applied to icons in toolbar mode.
   * @type {string}
   * @default 'w-5 h-5'
   */
  iconClass: { type: String, default: 'w-5 h-5' },

  /**
   * Button size for toolbar variant (tabs always use 'xs').
   * @type {string}
   * @default 'md'
   * @values 'xs' | 'sm' | 'md'
   */
  size: { type: String, default: 'md' },

  /**
   * Full-width mode. Defaults to true for tabs, false for toolbar.
   * @type {boolean}
   * @default undefined (auto-detected from variant)
   */
  block: { type: Boolean, default: undefined },
})

defineEmits(['update:modelValue'])

// Block defaults to true for tabs (full-width) and false for toolbar (inline)
const isBlock = computed(() => props.block ?? props.variant === 'tabs')

const wrapperClass = computed(() =>
  isBlock.value ? 'flex items-center rounded-lg' : 'inline-flex items-center rounded-lg',
)

const containerClass = computed(() =>
  props.variant === 'tabs'
    ? 'bg-gray-100 dark:bg-gray-800 p-0.5'
    : 'bg-gray-200/50 dark:bg-gray-800',
)

const buttonSize = computed(() => (props.variant === 'tabs' ? 'xs' : props.size))

// Apply rounding only to first/last buttons; middle buttons get rounded-none
const roundingClass = (idx) => {
  const last = props.options.length - 1
  const radius = props.variant === 'tabs' ? 'md' : 'lg'
  if (props.options.length === 1) return `rounded-${radius}`
  if (idx === 0) return `rounded-l-${radius} rounded-r-none`
  if (idx === last) return `rounded-r-${radius} rounded-l-none`
  return 'rounded-none'
}

const activeClass = computed(() =>
  props.variant === 'tabs'
    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-sm hover:bg-white dark:hover:bg-gray-700'
    : 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm hover:bg-white dark:hover:bg-gray-700',
)

const inactiveClass = computed(() =>
  props.variant === 'tabs'
    ? 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-300/40 dark:hover:bg-gray-700/50',
)
</script>

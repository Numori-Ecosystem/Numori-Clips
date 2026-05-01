<template>
  <input
    type="checkbox"
    :checked="modelValue ?? checked"
    :disabled="disabled"
    class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
    :class="sizeClass"
    @change="onChange"
  >
</template>

<script setup>
/**
 * UiCheckbox — Simple styled checkbox input with configurable size.
 *
 * Wraps a native `<input type="checkbox">` with consistent Tailwind styling,
 * primary color accent, and focus ring. Supports both v-model (`modelValue`)
 * and uncontrolled (`checked`) usage patterns.
 *
 * @example Basic v-model checkbox
 * <UiCheckbox v-model="agreed" />
 *
 * @example Small disabled checkbox
 * <UiCheckbox v-model="locked" size="sm" disabled />
 *
 * @example Uncontrolled with checked prop
 * <UiCheckbox :checked="true" @change="handleChange" />
 *
 * @emits {boolean} update:modelValue — Emitted when the checked state changes (v-model)
 * @emits {Event} change — Emitted with the native change event
 */
const props = defineProps({
  /**
   * Controlled checked state (v-model). Takes priority over `checked` when defined.
   * @type {boolean}
   * @default undefined
   */
  modelValue: { type: Boolean, default: undefined },

  /**
   * Uncontrolled initial checked state (used when modelValue is undefined).
   * @type {boolean}
   * @default false
   */
  checked: { type: Boolean, default: false },

  /**
   * Disabled state — dims the checkbox and prevents interaction.
   * @type {boolean}
   * @default false
   */
  disabled: { type: Boolean, default: false },

  /**
   * Checkbox size controlling width and height.
   * @type {string}
   * @default 'md'
   * @values 'sm' (3.5×3.5) | 'md' (4×4) | 'lg' (5×5)
   */
  size: { type: String, default: 'md' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-3.5 h-3.5'
    case 'lg':
      return 'w-5 h-5'
    default:
      return 'w-4 h-4'
  }
})

function onChange(e) {
  emit('update:modelValue', e.target.checked)
  emit('change', e)
}
</script>

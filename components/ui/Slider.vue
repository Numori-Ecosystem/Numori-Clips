<template>
  <input
    type="range"
    :min="min"
    :max="max"
    :step="step"
    :value="modelValue"
    :disabled="disabled"
    class="accent-primary-500"
    :class="widthClass"
    @input="onInput"
  >
</template>

<script setup>
/**
 * UiSlider — Native HTML range slider with primary color accent and width options.
 *
 * Wraps a `<input type="range">` with Tailwind accent color and configurable
 * width mode. Emits both `update:modelValue` for v-model and a raw `input` event.
 *
 * @example Basic slider
 * <UiSlider v-model="volume" :min="0" :max="100" />
 *
 * @example Flex slider with custom step
 * <UiSlider v-model="opacity" :min="0" :max="1" :step="0.01" width="flex" />
 *
 * @emits {number} update:modelValue — Emitted when the slider value changes (v-model)
 * @emits {Event} input — Emitted with the native input event on each change
 */
const props = defineProps({
  /**
   * Current slider value (v-model).
   * @type {number}
   * @default 0
   */
  modelValue: { type: Number, default: 0 },

  /**
   * Minimum allowed value.
   * @type {number | string}
   * @default 0
   */
  min: { type: [Number, String], default: 0 },

  /**
   * Maximum allowed value.
   * @type {number | string}
   * @default 100
   */
  max: { type: [Number, String], default: 100 },

  /**
   * Step increment between values.
   * @type {number | string}
   * @default 1
   */
  step: { type: [Number, String], default: 1 },

  /**
   * Disabled state — prevents interaction.
   * @type {boolean}
   * @default false
   */
  disabled: { type: Boolean, default: false },

  /**
   * Width mode: 'full' applies w-full, 'flex' applies flex-1 with reduced height.
   * @type {string}
   * @default 'full'
   * @values 'full' | 'flex'
   */
  width: { type: String, default: 'full' },
})

const emit = defineEmits(['update:modelValue', 'input'])

const widthClass = computed(() => {
  switch (props.width) {
    case 'flex':
      return 'flex-1 h-1.5'
    default:
      return 'w-full'
  }
})

function onInput(e) {
  const val = Number(e.target.value)
  emit('update:modelValue', val)
  emit('input', e)
}
</script>

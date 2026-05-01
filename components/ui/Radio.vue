<template>
  <input
    type="radio"
    :checked="modelValue === value"
    :disabled="disabled"
    :name="name"
    :value="value"
    class="rounded-full border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
    :class="sizeClass"
    @change="onChange"
  >
</template>

<script setup>
/**
 * UiRadio — Simple styled radio input with configurable size.
 *
 * Wraps a native `<input type="radio">` with consistent Tailwind styling,
 * primary color accent, and focus ring. Use with v-model for group selection.
 *
 * @example Radio group
 * <UiRadio v-model="selected" value="a" name="choice" />
 * <UiRadio v-model="selected" value="b" name="choice" />
 */
const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: null },
  value: { type: [String, Number, Boolean], required: true },
  name: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: 'md' },
})

const emit = defineEmits(['update:modelValue'])

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

function onChange() {
  emit('update:modelValue', props.value)
}
</script>

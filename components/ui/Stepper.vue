<template>
  <div class="flex justify-center gap-2">
    <button
      v-for="i in steps"
      :key="i"
      class="rounded-full transition-all duration-200"
      :class="dotClasses(i)"
      @click="$emit('update:modelValue', i)"
    />
  </div>
</template>

<script setup>
/**
 * UiStepper — Dot-based step indicator for wizards and multi-step flows.
 *
 * Renders a row of clickable dots representing steps. The current step is
 * highlighted and wider, completed steps use a muted accent, and future
 * steps are gray. Clicking a dot emits the step number via v-model.
 *
 * @example Basic 4-step wizard
 * <UiStepper v-model="currentStep" :steps="4" />
 *
 * @example Non-interactive indicator
 * <UiStepper :model-value="step" :steps="3" />
 *
 * @emits {number} update:modelValue — Emitted when a step dot is clicked
 */
const props = defineProps({
  /**
   * Current active step (v-model). 1-indexed.
   * @type {number}
   * @default 1
   */
  modelValue: { type: Number, default: 1 },

  /**
   * Total number of steps.
   * @type {number}
   * @required
   */
  steps: { type: Number, required: true },
})

defineEmits(['update:modelValue'])

const dotClasses = (i) => {
  const base = 'h-2'
  if (i === props.modelValue) return `${base} w-6 bg-primary-500`
  if (i < props.modelValue) return `${base} w-2 bg-primary-300 dark:bg-primary-700`
  return `${base} w-2 bg-gray-300 dark:bg-gray-700`
}
</script>

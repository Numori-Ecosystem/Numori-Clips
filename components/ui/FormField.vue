<template>
  <div>
    <label v-if="label" :class="labelClasses">
      {{ label }}
      <span v-if="optional" class="font-normal text-gray-400 dark:text-gray-600">(optional)</span>
    </label>
    <slot />
    <p v-if="hint" class="text-xs text-gray-500 dark:text-gray-500 mt-1">{{ hint }}</p>
    <p v-if="error" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ error }}</p>
  </div>
</template>

<script setup>
/**
 * UiFormField — Label + input wrapper with optional hint and error text.
 *
 * Wraps any form control (UiInput, UiSelect, etc.) with a consistent label,
 * optional "(optional)" suffix, hint text below the input, and error message.
 * Reduces the repeated label + div + hint pattern across all form-heavy modals.
 *
 * @example Basic field
 * <UiFormField label="Email">
 *   <UiInput v-model="email" type="email" />
 * </UiFormField>
 *
 * @example Field with hint and optional marker
 * <UiFormField label="Password hint" optional hint="A clue to help remember">
 *   <UiInput v-model="hint" />
 * </UiFormField>
 *
 * @example Field with error
 * <UiFormField label="Password" :error="pwError">
 *   <UiInput v-model="pw" type="password" />
 * </UiFormField>
 *
 * @example Inline label style (no bottom margin)
 * <UiFormField label="Font Ligatures" inline>
 *   <UiToggle v-model="ligatures" />
 * </UiFormField>
 *
 * @slot default — Form control (e.g. UiInput, UiSelect, UiToggle)
 */
const props = defineProps({
  /**
   * Label text displayed above the input.
   * @type {string}
   * @default ''
   */
  label: { type: String, default: '' },

  /**
   * Show "(optional)" suffix after the label.
   * @type {boolean}
   * @default false
   */
  optional: { type: Boolean, default: false },

  /**
   * Hint text displayed below the input in gray.
   * @type {string}
   * @default ''
   */
  hint: { type: String, default: '' },

  /**
   * Error message displayed below the input in red.
   * @type {string}
   * @default ''
   */
  error: { type: String, default: '' },

  /**
   * Inline label style — no bottom margin, suitable for toggle rows.
   * @type {boolean}
   * @default false
   */
  inline: { type: Boolean, default: false },
})

const labelClasses = computed(() =>
  props.inline
    ? 'block text-sm font-medium text-gray-700 dark:text-gray-400'
    : 'block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1',
)
</script>

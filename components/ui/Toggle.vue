<template>
  <!-- Accessible toggle switch rendered as a button with role="switch" -->
  <button
    type="button"
    :disabled="disabled"
    class="relative inline-flex items-center flex-shrink-0 rounded-full transition-colors"
    :class="[
      sizeClasses.track,
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      modelValue ? activeColor : inactiveColor,
    ]"
    role="switch"
    :aria-checked="modelValue"
    @click="toggle"
  >
    <span
      class="inline-block transform rounded-full bg-white transition-transform"
      :class="[sizeClasses.dot, modelValue ? sizeClasses.translateOn : sizeClasses.translateOff]"
    />
  </button>
</template>

<script setup>
/**
 * UiToggle — Accessible toggle switch component with two sizes and multiple color themes.
 *
 * Renders as a `<button role="switch">` with smooth sliding-dot animation.
 * Supports disabled and read-only states. The `sm` size matches ProfileModal styling
 * (600-shade active colors), while `md` matches SettingsModal styling (500-shade).
 *
 * @example Basic toggle
 * <UiToggle v-model="darkMode" />
 *
 * @example Small green toggle
 * <UiToggle v-model="notifications" size="sm" color="green" />
 *
 * @example Read-only toggle (parent controls state)
 * <UiToggle :model-value="isActive" readonly @click="handleToggle" />
 *
 * @emits {boolean} update:modelValue — Emitted when the toggle is switched (v-model)
 */
const props = defineProps({
  /**
   * Current on/off state (v-model).
   * @type {boolean}
   * @default false
   */
  modelValue: { type: Boolean, default: false },

  /**
   * Disabled state — dims the toggle and prevents interaction.
   * @type {boolean}
   * @default false
   */
  disabled: { type: Boolean, default: false },

  /**
   * Read-only mode — renders visually but ignores clicks (parent handles toggling).
   * @type {boolean}
   * @default false
   */
  readonly: { type: Boolean, default: false },

  /**
   * Toggle size. 'sm' uses a compact track (h-5 w-9) with 600-shade active colors;
   * 'md' uses a larger track (h-6 w-11) with 500-shade active colors.
   * @type {string}
   * @default 'md'
   * @values 'sm' | 'md'
   */
  size: { type: String, default: 'md' },

  /**
   * Active (on) track color theme.
   * @type {string}
   * @default 'primary'
   * @values 'primary' | 'green' | 'red'
   */
  color: { type: String, default: 'primary' },
})

const emit = defineEmits(['update:modelValue'])

// Active color uses different shade intensities per size for visual consistency
const activeColor = computed(() => {
  if (props.size === 'sm') {
    // ProfileModal style uses 600
    const map = { primary: 'bg-primary-600', green: 'bg-success-600', red: 'bg-red-600' }
    return map[props.color] ?? map.primary
  }
  // SettingsModal style uses 500
  const map = { primary: 'bg-primary-500', green: 'bg-success-500', red: 'bg-red-500' }
  return map[props.color] ?? map.primary
})

const inactiveColor = computed(() => {
  // sm (ProfileModal): bg-gray-300 dark:bg-gray-600
  // md (SettingsModal): bg-gray-300 dark:bg-gray-700
  return props.size === 'sm' ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-300 dark:bg-gray-700'
})

const sizeClasses = computed(() => {
  if (props.size === 'sm') {
    return {
      track: 'h-5 w-9 border-2 border-transparent',
      dot: 'h-4 w-4 shadow',
      translateOn: 'translate-x-4',
      translateOff: 'translate-x-0',
    }
  }
  return {
    track: 'h-6 w-11',
    dot: 'h-4 w-4',
    translateOn: 'translate-x-6',
    translateOff: 'translate-x-1',
  }
})

const toggle = () => {
  if (!props.disabled && !props.readonly) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

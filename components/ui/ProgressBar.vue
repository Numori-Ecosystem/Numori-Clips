<template>
  <div class="space-y-1">
    <!-- Optional label and value display row -->
    <div
      v-if="label || showValue"
      class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500"
    >
      <span v-if="label">{{ label }}</span>
      <span v-if="showValue">{{ current }} / {{ total }}</span>
    </div>
    <!-- Track background with animated fill bar -->
    <div class="w-full rounded-full overflow-hidden" :class="[trackClass, heightClass]">
      <div
        class="h-full rounded-full transition-all duration-200"
        :class="barClass"
        :style="{ width: percentage + '%' }"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * UiProgressBar — Horizontal progress bar with label, value display, and color themes.
 *
 * Renders a rounded track with an animated fill bar representing current/total progress.
 * Supports an optional text label above the bar and a "current / total" value display.
 * The fill percentage is clamped to 0–100% and handles zero-total gracefully.
 *
 * @example Basic progress bar
 * <UiProgressBar :current="45" :total="100" />
 *
 * @example Labeled progress with value
 * <UiProgressBar :current="3" :total="10" label="Steps" show-value />
 *
 * @example Red thin progress bar
 * <UiProgressBar :current="90" :total="100" color="red" height="xs" />
 */
const props = defineProps({
  /**
   * Current progress value.
   * @type {number}
   * @default 0
   */
  current: { type: Number, default: 0 },

  /**
   * Total/maximum value (denominator for percentage calculation).
   * @type {number}
   * @default 100
   */
  total: { type: Number, default: 100 },

  /**
   * Optional label text displayed above the bar on the left.
   * @type {string}
   * @default ''
   */
  label: { type: String, default: '' },

  /**
   * Show "current / total" text above the bar on the right.
   * @type {boolean}
   * @default false
   */
  showValue: { type: Boolean, default: false },

  /**
   * Color theme for the fill bar.
   * @type {string}
   * @default 'primary'
   * @values 'primary' | 'green' | 'red' | 'amber'
   */
  color: { type: String, default: 'primary' },

  /**
   * Track height preset.
   * @type {string}
   * @default 'sm'
   * @values 'xs' (h-1) | 'sm' (h-2) | 'md' (h-3)
   */
  height: { type: String, default: 'sm' },
})

// Calculate fill percentage, clamped to 0–100, safe against zero total
const percentage = computed(() =>
  props.total > 0 ? Math.min(100, Math.round((props.current / props.total) * 100)) : 0,
)

const heightClass = computed(() => {
  const map = { xs: 'h-1', sm: 'h-2', md: 'h-3' }
  return map[props.height] || map.sm
})

const trackClass = 'bg-gray-200 dark:bg-gray-700'

const barClass = computed(() => {
  const map = {
    primary: 'bg-primary-600',
    green: 'bg-success-600',
    red: 'bg-red-600',
    amber: 'bg-amber-600',
  }
  return map[props.color] || map.primary
})
</script>

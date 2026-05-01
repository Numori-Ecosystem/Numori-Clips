<template>
  <!-- Wrapper with group hover to show/hide the tooltip -->
  <div class="relative group" :class="inline ? 'inline-flex' : ''">
    <!-- Trigger content (default slot) -->
    <slot />
    <!-- Tooltip bubble: hidden by default, shown on group hover -->
    <div
      class="absolute px-3 py-2 rounded-lg text-white text-xs leading-relaxed shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none"
      :class="[positionClass, widthClass, 'bg-gray-900 dark:bg-gray-700 z-50']"
    >
      <slot name="content">
        {{ text }}
      </slot>
      <div v-if="arrow" :class="arrowClass" />
    </div>
  </div>
</template>

<script setup>
/**
 * UiTooltip — CSS-only tooltip that appears on hover with configurable position and arrow.
 *
 * Wraps any content in a `group` container and shows a tooltip bubble on hover.
 * Supports four positions (top, bottom, left, right), optional directional arrow,
 * and either plain text or rich content via the `#content` slot.
 * No JavaScript event handling — uses pure CSS `group-hover` for show/hide.
 *
 * @example Simple text tooltip
 * <UiTooltip text="Save your changes">
 *   <UiButton>Save</UiButton>
 * </UiTooltip>
 *
 * @example Bottom tooltip without arrow
 * <UiTooltip text="More info" position="bottom" :arrow="false">
 *   <Icon name="mdi:information" class="w-5 h-5" />
 * </UiTooltip>
 *
 * @example Rich content tooltip
 * <UiTooltip position="right">
 *   <UiButton>Hover me</UiButton>
 *   <template #content>
 *     <strong>Title</strong>
 *     <p>Detailed description here.</p>
 *   </template>
 * </UiTooltip>
 *
 * @slot default — Trigger element that the tooltip wraps
 * @slot content — Rich tooltip content (alternative to the text prop)
 */
const props = defineProps({
  /**
   * Plain text content for the tooltip. Ignored when the `#content` slot is used.
   * @type {string}
   * @default ''
   */
  text: { type: String, default: '' },

  /**
   * Position of the tooltip relative to the trigger element.
   * @type {string}
   * @default 'top'
   * @values 'top' | 'bottom' | 'left' | 'right'
   */
  position: { type: String, default: 'top' },

  /**
   * Width class for the tooltip bubble.
   * @type {string}
   * @default 'w-56'
   */
  width: { type: String, default: 'w-56' },

  /**
   * Show a directional arrow pointing from the tooltip toward the trigger.
   * @type {boolean}
   * @default true
   */
  arrow: { type: Boolean, default: true },

  /**
   * Render the wrapper as inline-flex instead of block for inline trigger elements.
   * @type {boolean}
   * @default true
   */
  inline: { type: Boolean, default: true },
})

const widthClass = computed(() => props.width)

// Position classes map tooltip placement using absolute positioning + transforms
const positionClass = computed(() => {
  const map = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }
  return map[props.position] || map.top
})

// Arrow uses CSS border trick to create a triangle pointing toward the trigger
const arrowClass = computed(() => {
  const base = 'absolute border-4 border-transparent'
  const map = {
    top: `${base} top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700`,
    bottom: `${base} bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700`,
    left: `${base} left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700`,
    right: `${base} right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700`,
  }
  return map[props.position] || map.top
})
</script>

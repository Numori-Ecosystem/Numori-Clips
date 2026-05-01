<template>
  <div>
    <!-- Invisible full-screen backdrop to capture outside clicks -->
    <div v-if="show" class="fixed inset-0" :class="backdropZ" @click="$emit('close')" />
    <!-- Animated popup panel positioned at (x, y + offsetY) -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="show"
        ref="panelRef"
        class="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
        :class="[width, panelZ]"
        :style="positionStyle"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup>
/**
 * UiPopup — Absolutely positioned popup panel with viewport-aware clamping.
 *
 * Renders a floating panel at the given (x, y) coordinates relative to its offset parent.
 * Automatically clamps position to keep the panel within the visible viewport with an 8px margin.
 * Includes an invisible full-screen backdrop that emits 'close' on click.
 *
 * @example Context menu popup
 * <UiPopup :show="showMenu" :x="menuX" :y="menuY" @close="showMenu = false">
 *   <UiDropdownItem icon="mdi:pencil" label="Edit" @click="edit" />
 *   <UiDropdownItem icon="mdi:trash-can" label="Delete" color="red" @click="del" />
 * </UiPopup>
 *
 * @example Popup with offset and custom width
 * <UiPopup :show="open" :x="posX" :y="posY" :offset-y="8" width="w-64" @close="open = false">
 *   <div class="p-3">Custom content</div>
 * </UiPopup>
 *
 * @emits {void} close — Emitted when the backdrop is clicked to dismiss the popup
 *
 * @slot default — Popup content
 */
const props = defineProps({
  /**
   * Controls popup visibility.
   * @type {boolean}
   * @default false
   */
  show: { type: Boolean, default: false },

  /**
   * Horizontal position in pixels relative to the offset parent.
   * @type {number}
   * @default 0
   */
  x: { type: Number, default: 0 },

  /**
   * Vertical position in pixels relative to the offset parent.
   * @type {number}
   * @default 0
   */
  y: { type: Number, default: 0 },

  /**
   * Additional vertical offset added to the y position (e.g. to clear a trigger element).
   * @type {number}
   * @default 0
   */
  offsetY: { type: Number, default: 0 },

  /**
   * Width class for the popup panel.
   * @type {string}
   * @default 'w-56'
   */
  width: { type: String, default: 'w-56' },

  /**
   * Z-index class for the popup panel.
   * @type {string}
   * @default 'z-50'
   */
  panelZ: { type: String, default: 'z-50' },

  /**
   * Z-index class for the invisible backdrop behind the panel.
   * @type {string}
   * @default 'z-40'
   */
  backdropZ: { type: String, default: 'z-40' },
})

defineEmits(['close'])

const panelRef = ref(null)
const clampedPos = ref({ left: 0, top: 0 })

const positionStyle = computed(() => ({
  left: clampedPos.value.left + 'px',
  top: clampedPos.value.top + 'px',
}))

// Clamp the panel position so it stays within the viewport (8px margin)
const updatePosition = () => {
  const left = props.x
  const top = props.y + props.offsetY

  nextTick(() => {
    const el = panelRef.value
    if (!el) return

    const parent = el.offsetParent || document.body
    const parentRect = parent.getBoundingClientRect()
    const panelW = el.offsetWidth
    const panelH = el.offsetHeight
    const viewW = window.innerWidth
    const viewH = window.innerHeight

    // Convert to viewport coords, clamp, convert back
    let absLeft = parentRect.left + left
    let absTop = parentRect.top + top

    const margin = 8
    if (absLeft + panelW > viewW - margin) absLeft = viewW - panelW - margin
    if (absLeft < margin) absLeft = margin
    if (absTop + panelH > viewH - margin) absTop = viewH - panelH - margin
    if (absTop < margin) absTop = margin

    clampedPos.value = {
      left: absLeft - parentRect.left,
      top: absTop - parentRect.top,
    }
  })
}

watch(
  () => [props.show, props.x, props.y, props.offsetY],
  () => {
    if (props.show) {
      // Set initial position immediately so the panel renders near the right spot
      clampedPos.value = { left: props.x, top: props.y + props.offsetY }
      updatePosition()
    }
  },
  { immediate: true },
)
</script>

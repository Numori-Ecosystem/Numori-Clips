<template>
  <div ref="containerRef" class="relative">
    <!-- Trigger slot: receives { open, toggle } for controlling the dropdown -->
    <slot name="trigger" :open="isOpen" :toggle="toggle" />

    <!-- Dropdown panel with animated enter/leave transitions -->
    <Transition
      :enter-active-class="transitionClasses.enterActive"
      :enter-from-class="transitionClasses.enterFrom"
      :enter-to-class="transitionClasses.enterTo"
      :leave-active-class="transitionClasses.leaveActive"
      :leave-from-class="transitionClasses.leaveFrom"
      :leave-to-class="transitionClasses.leaveTo"
    >
      <div v-show="isOpen" :class="panelClasses">
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
/**
 * UiDropdown — Headless dropdown menu with configurable alignment, direction, and transitions.
 *
 * Uses a trigger slot that receives `open` state and `toggle` function, and a default
 * slot for menu content that receives a `close` function. Closes on outside click and
 * Escape key. Supports both downward and upward drop directions with matching transitions.
 * Exposes `isOpen`, `toggle()`, and `close()` for programmatic control.
 *
 * @example Basic dropdown with button trigger
 * <UiDropdown>
 *   <template #trigger="{ toggle }">
 *     <UiButton @click="toggle">Menu</UiButton>
 *   </template>
 *   <UiDropdownItem icon="mdi:pencil" label="Edit" @click="edit" />
 *   <UiDropdownItem icon="mdi:trash-can" label="Delete" color="red" @click="del" />
 * </UiDropdown>
 *
 * @example Right-aligned, drop-up
 * <UiDropdown align="right" drop="up" width="w-48">
 *   <template #trigger="{ toggle }">
 *     <UiButton variant="ghost" icon-only @click="toggle">
 *       <Icon name="mdi:dots-vertical" class="w-5 h-5" />
 *     </UiButton>
 *   </template>
 *   <slot />
 * </UiDropdown>
 *
 * @emits {void} open — Emitted when the dropdown opens
 * @emits {void} close — Emitted when the dropdown closes
 *
 * @slot trigger — Trigger element that opens the dropdown. Receives { open: boolean, toggle: Function }
 * @slot default — Dropdown menu content. Receives { close: Function }
 *
 * @see UiDropdownItem — Standard menu item for use inside this dropdown
 * @see UiDropdownSubmenu — Nested submenu for this dropdown
 */
const props = defineProps({
  /**
   * Width class applied to the dropdown panel.
   * @type {string}
   * @default 'w-56'
   * @example 'w-48', 'w-64', 'w-72'
   */
  width: { type: String, default: 'w-56' },

  /**
   * Horizontal alignment of the panel relative to the trigger.
   * @type {string}
   * @default 'left'
   * @values 'left' | 'right'
   */
  align: { type: String, default: 'left' },

  /**
   * Drop direction — 'down' opens below the trigger, 'up' opens above.
   * @type {string}
   * @default 'down'
   * @values 'down' | 'up'
   */
  drop: { type: String, default: 'down' },

  /**
   * Override all default panel classes (bg, border, rounded, shadow).
   * When set, the built-in panel styling is completely replaced.
   * @type {string}
   * @default ''
   */
  panelClass: { type: String, default: '' },
})

const emit = defineEmits(['open', 'close'])

const isOpen = ref(false)
const containerRef = ref(null)

// Build panel positioning/styling classes, or use custom override
const panelClasses = computed(() => {
  if (props.panelClass) return props.panelClass
  const align = props.align === 'right' ? 'right-0' : 'left-0'
  const dropDir = props.drop === 'up' ? 'bottom-full mb-1' : 'mt-1'
  return `absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 ${props.width} ${align} ${dropDir}`
})

// Use slide-up transition for drop="up", scale transition for drop="down"
const transitionClasses = computed(() => {
  if (props.drop === 'up') {
    return {
      enterActive: 'transition ease-out duration-150',
      enterFrom: 'opacity-0 translate-y-1',
      enterTo: 'opacity-100 translate-y-0',
      leaveActive: 'transition ease-in duration-100',
      leaveFrom: 'opacity-100 translate-y-0',
      leaveTo: 'opacity-0 translate-y-1',
    }
  }
  return {
    enterActive: 'transition duration-100 ease-out',
    enterFrom: 'opacity-0 scale-95',
    enterTo: 'opacity-100 scale-100',
    leaveActive: 'transition duration-75 ease-in',
    leaveFrom: 'opacity-100 scale-100',
    leaveTo: 'opacity-0 scale-95',
  }
})

const toggle = () => {
  isOpen.value = !isOpen.value
  emit(isOpen.value ? 'open' : 'close')
}

const close = () => {
  if (isOpen.value) {
    isOpen.value = false
    emit('close')
  }
}

onClickOutside(containerRef, close)

useEventListener(document, 'keydown', (e) => {
  if (e.key === 'Escape') close()
})

defineExpose({ isOpen, toggle, close })
</script>

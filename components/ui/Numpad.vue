<template>
  <div
    ref="numpadRef"
    class="grid grid-cols-3 gap-3 max-w-[264px] mx-auto outline-none"
  >
    <button
      v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
      :key="n"
      type="button"
      tabindex="-1"
      class="h-16 w-full text-xl font-medium rounded-2xl transition-all duration-150 text-gray-800 dark:text-gray-100 border shadow-sm active:scale-95"
      :class="pressedKey === n
        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 scale-95'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 active:bg-gray-100 dark:active:bg-gray-700'"
      :disabled="disabled"
      @click="onDigit(n)"
    >
      {{ n }}
    </button>

    <!-- Bottom-left slot (e.g. biometrics button) -->
    <slot name="bottom-left">
      <div />
    </slot>

    <button
      type="button"
      tabindex="-1"
      class="h-16 w-full text-xl font-medium rounded-2xl transition-all duration-150 text-gray-800 dark:text-gray-100 border shadow-sm active:scale-95"
      :class="pressedKey === 0
        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 scale-95'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 active:bg-gray-100 dark:active:bg-gray-700'"
      :disabled="disabled"
      @click="onDigit(0)"
    >
      0
    </button>

    <button
      type="button"
      tabindex="-1"
      class="h-16 w-full rounded-2xl transition-all duration-150 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
      :disabled="!canDelete"
      @click="$emit('delete')"
    >
      <Icon name="mdi:backspace-outline" class="w-6 h-6" />
    </button>
  </div>
</template>

<script setup>
/**
 * UiNumpad — A numeric keypad primitive for PIN entry and similar use cases.
 *
 * Emits digit presses and delete actions. Supports physical keyboard input
 * with visual key highlighting. Exposes a bottom-left slot for custom actions
 * (e.g. biometrics button).
 *
 * @example Basic usage
 * <UiNumpad :can-delete="pin.length > 0" @digit="onDigit" @delete="onDelete" />
 *
 * @example With biometrics slot
 * <UiNumpad :can-delete="pin.length > 0" @digit="onDigit" @delete="onDelete">
 *   <template #bottom-left>
 *     <button @click="useBiometrics">🔒</button>
 *   </template>
 * </UiNumpad>
 */

const props = defineProps({
  /** Whether the numpad is disabled */
  disabled: { type: Boolean, default: false },
  /** Whether the delete button is enabled */
  canDelete: { type: Boolean, default: false },
  /** Whether the numpad listens for keyboard input globally */
  captureKeyboard: { type: Boolean, default: false },
})

const emit = defineEmits(['digit', 'delete'])

const numpadRef = ref(null)
const pressedKey = ref(null)

const onDigit = (digit) => {
  if (props.disabled) return
  emit('digit', digit)
}

const handleKeydown = (e) => {
  if (props.disabled) return

  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault()
    const digit = Number(e.key)
    pressedKey.value = digit
    setTimeout(() => { pressedKey.value = null }, 150)
    onDigit(digit)
    return
  }

  if (e.key === 'Backspace') {
    e.preventDefault()
    emit('delete')
  }
}

// Attach/detach global keyboard listener based on captureKeyboard prop
watch(
  () => props.captureKeyboard,
  (active) => {
    if (active) {
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

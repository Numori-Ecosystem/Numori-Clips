<template>
  <!-- Teleported to body to avoid z-index stacking context issues -->
  <Teleport to="body">
    <!-- Backdrop overlay with fade transition -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 flex items-center justify-center"
        :class="[zClass, paddingClass, backdropClass]"
        @click.self="!persistent && $emit('close')"
      >
        <Transition
          enter-active-class="transition ease-out duration-300"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-200"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
          appear
        >
          <div
            v-if="show"
            class="modal-panel bg-white dark:bg-gray-925 overflow-hidden flex flex-col"
            :class="[panelClass, maxWidthClass, roundedClass, mobileLayoutClass]"
            @click.stop
          >
            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * UiModal — Teleported modal dialog with backdrop, configurable max-width, and enter/leave transitions.
 *
 * Renders a centered overlay panel teleported to `<body>`. Supports ten max-width presets
 * (xs through 5xl and full-screen), persistent mode to prevent backdrop-click dismissal,
 * and customizable z-index and padding. The panel uses a scale+fade transition on enter/leave.
 *
 * @example Basic modal
 * <UiModal :show="isOpen" @close="isOpen = false">
 *   <div class="p-6">Hello!</div>
 * </UiModal>
 *
 * @example Large persistent modal
 * <UiModal :show="showEditor" max-width="3xl" persistent>
 *   <ModalHeader @close="showEditor = false" />
 *   <div class="p-6">Editor content</div>
 * </UiModal>
 *
 * @example Full-screen modal
 * <UiModal :show="showFull" max-width="full">
 *   <div class="h-full">Full screen content</div>
 * </UiModal>
 *
 * @example Non-fullscreen on mobile
 * <UiModal :show="isOpen" :fullscreen-mobile="false" @close="isOpen = false">
 *   <div class="p-6">Centered on all screens</div>
 * </UiModal>
 *
 * @emits {void} close — Emitted when the modal should close (backdrop click or programmatic)
 *
 * @slot default — Modal content
 */
const props = defineProps({
  /**
   * Controls modal visibility. Use with v-model or :show + @close.
   * @type {boolean}
   * @default false
   */
  show: { type: Boolean, default: false },

  /**
   * Maximum width preset for the modal panel.
   * @type {string}
   * @default 'sm'
   * @values 'xs' (20rem) | 'sm' (24rem) | 'md' (28rem) | 'lg' (32rem) | 'xl' (36rem) | '2xl' (42rem) | '3xl' (48rem) | '4xl' (56rem) | '5xl' (64rem) | 'full'
   */
  maxWidth: { type: String, default: 'sm' },

  /**
   * Whether the modal goes fullscreen on mobile viewports.
   * When true, the panel fills the screen on mobile and respects safe area insets.
   * @type {boolean}
   * @default true
   */
  fullscreenMobile: { type: Boolean, default: true },

  /**
   * Persistent mode — prevents closing when clicking the backdrop overlay.
   * @type {boolean}
   * @default false
   */
  persistent: { type: Boolean, default: false },

  /**
   * Additional CSS classes applied to the modal panel element.
   * @type {string}
   * @default ''
   */
  panelClass: { type: String, default: '' },

  /**
   * Z-index class for the backdrop and modal layers.
   * @type {string}
   * @default 'z-50'
   */
  z: { type: String, default: 'z-50' },

  /**
   * Padding class around the modal panel (applied to the backdrop container).
   * @type {string}
   * @default 'md:p-4'
   */
  padding: { type: String, default: 'md:p-4' },
})

const emit = defineEmits(['close'])

// ── Back-button interception (Capacitor) ──
const { register: registerBack, unregister: unregisterBack } = useBackButton()
let backHandlerId = null

watch(() => props.show, (visible) => {
  if (visible) {
    backHandlerId = registerBack(() => {
      if (props.persistent) return false
      emit('close')
      return true
    })
  } else if (backHandlerId !== null) {
    unregisterBack(backHandlerId)
    backHandlerId = null
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (backHandlerId !== null) {
    unregisterBack(backHandlerId)
    backHandlerId = null
  }
})

const zClass = computed(() => props.z)
const paddingClass = computed(() => props.padding)

const backdropClass = computed(() => {
  if (props.fullscreenMobile) {
    return 'bg-transparent md:bg-black md:bg-opacity-50'
  }
  return 'bg-black bg-opacity-50 p-4'
})

const mobileLayoutClass = computed(() => {
  if (props.maxWidth === 'full') return 'fixed inset-0'

  if (props.fullscreenMobile) {
    return 'fixed inset-0 modal-panel--safe-area md:static md:inset-auto'
  }
  // Non-fullscreen on mobile: centered dialog with max-height
  return 'relative max-h-[calc(100vh-2rem)] md:static'
})

const maxWidthClass = computed(() => {
  if (props.maxWidth === 'full') return 'w-full h-full'

  const map = {
    xs: 'md:max-w-xs',
    sm: 'md:max-w-sm',
    md: 'md:max-w-md',
    lg: 'md:max-w-lg',
    xl: 'md:max-w-xl',
    '2xl': 'md:max-w-2xl',
    '3xl': 'md:max-w-3xl',
    '4xl': 'md:max-w-4xl',
    '5xl': 'md:max-w-5xl',
  }

  if (props.fullscreenMobile) {
    return `md:w-full ${map[props.maxWidth] || map.sm}`
  }
  return `w-full ${map[props.maxWidth] || map.sm}`
})

const roundedClass = computed(() => {
  if (props.maxWidth === 'full') return 'rounded-none'

  if (props.fullscreenMobile) {
    return 'rounded-none md:rounded-lg'
  }
  return 'rounded-lg'
})
</script>


<style scoped>
@media (max-width: 767px) {
  .modal-panel {
    max-height: 100% !important;
  }

  .modal-panel--safe-area {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}
</style>

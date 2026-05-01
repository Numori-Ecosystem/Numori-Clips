<template>
  <UiModal :show="show" max-width="sm" :fullscreen-mobile="fullscreenMobile" :panel-class="panelClass" @close="handleClose">
    <div ref="promptRef" class="flex flex-col max-h-full" :class="panelClass.includes('overflow-visible') ? 'overflow-visible' : 'overflow-hidden'" @keydown="onKeydown">
      <div class="flex items-center justify-between p-4 pb-0 mb-3 shrink-0">
        <div class="flex items-center gap-2">
          <Icon v-if="icon" :name="icon" class="w-5 h-5" :class="iconColorClass" />
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-200 leading-none">{{ title }}</h2>
        </div>
        <UiButton variant="ghost" color="gray" icon-only @click="handleClose">
          <Icon name="mdi:close" class="block w-5 h-5" />
        </UiButton>
      </div>

      <div v-if="body || $slots.default" class="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed px-4 min-h-0" :class="panelClass.includes('overflow-visible') ? 'overflow-visible' : 'overflow-y-auto'">
        <slot>{{ body }}</slot>
      </div>

      <div class="flex justify-end gap-2 p-4 pt-0 shrink-0">
        <slot name="actions">
          <UiButton variant="ghost" color="gray" :disabled="loading" @click="handleClose">
            {{ cancelLabel }}
          </UiButton>
          <UiButton ref="confirmRef" variant="solid" :color="confirmColor" :loading="loading" @click="handleConfirm">
            {{ confirmLabel }}
          </UiButton>
        </slot>
      </div>
    </div>
  </UiModal>
</template>

<script setup>
/**
 * UiPrompt — A modal prompt primitive for confirmations, choices, and user decisions.
 *
 * Wraps UiModal with a consistent header (icon + title + close), body content, and
 * action buttons. Handles keyboard (Escape to close, Enter to confirm), auto-focuses
 * the confirm button on open, and prevents double-submit while loading.
 *
 * For simple text prompts, use the `body` prop. For rich content, use the default slot.
 * Override the `#actions` slot for custom button layouts.
 *
 * @example Simple confirmation (props only, no slots needed)
 * <UiPrompt :show="confirming" title="Delete item?" body="This action cannot be undone."
 *   icon="mdi:delete" confirm-label="Delete" confirm-color="red"
 *   @close="confirming = false" @confirm="doDelete" />
 *
 * @example Rich body content
 * <UiPrompt :show="open" title="Warning" @close="open = false" @confirm="proceed">
 *   <p>This will affect <strong>{{ count }}</strong> items.</p>
 * </UiPrompt>
 *
 * @example Custom actions
 * <UiPrompt :show="choosing" title="Export Options" @close="choosing = false">
 *   Include results in the export?
 *   <template #actions>
 *     <UiButton variant="ghost" color="gray" @click="doExport(false)">Without</UiButton>
 *     <UiButton @click="doExport(true)">With Results</UiButton>
 *   </template>
 * </UiPrompt>
 *
 * @example Form prompt (disable Enter-to-confirm)
 * <UiPrompt :show="open" title="New Group" :confirm-on-enter="false" @close="open = false">
 *   <UiInput v-model="name" @keydown.enter="save" />
 * </UiPrompt>
 */
const props = defineProps({
  /** Controls prompt visibility. */
  show: { type: Boolean, default: false },
  /** Prompt heading text. */
  title: { type: String, default: 'Confirm' },
  /** Optional icon name displayed before the title. */
  icon: { type: String, default: null },
  /** Plain text body content. Ignored when the default slot is used. */
  body: { type: String, default: null },
  /** Label for the confirm button (default actions only). */
  confirmLabel: { type: String, default: 'Confirm' },
  /** Label for the cancel button (default actions only). */
  cancelLabel: { type: String, default: 'Cancel' },
  /** Color of the confirm button and icon. */
  confirmColor: { type: String, default: 'primary' },
  /** Shows a loading spinner on the confirm button and prevents double-submit. */
  loading: { type: Boolean, default: false },
  /** Whether pressing Enter triggers confirm. Disable for form-based prompts. */
  confirmOnEnter: { type: Boolean, default: true },
  /** Whether the prompt goes fullscreen on mobile viewports. */
  fullscreenMobile: { type: Boolean, default: false },
  /** Additional CSS class(es) applied to the modal panel element. */
  panelClass: { type: String, default: '' },
})

const emit = defineEmits(['close', 'confirm'])

const confirmRef = ref(null)
const hasCustomActions = computed(() => !!useSlots().actions)

const iconColorClass = computed(() => {
  const map = {
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    primary: 'text-primary-600 dark:text-primary-400',
    gray: 'text-gray-500 dark:text-gray-400',
  }
  return map[props.confirmColor] || map.primary
})

const handleClose = () => {
  if (!props.loading) emit('close')
}

const handleConfirm = () => {
  if (!props.loading) emit('confirm')
}

const onKeydown = (e) => {
  if (e.key === 'Enter' && props.confirmOnEnter && !hasCustomActions.value && !props.loading) {
    e.preventDefault()
    handleConfirm()
  }
}

// Auto-focus confirm button when prompt opens
watch(() => props.show, (open) => {
  if (open) {
    nextTick(() => {
      const el = confirmRef.value?.$el ?? confirmRef.value
      if (el instanceof HTMLElement) el.focus()
    })
  }
})
</script>

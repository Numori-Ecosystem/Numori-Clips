<template>
  <UiPrompt
    :show="isOpen"
    :title="title"
    :icon="icon"
    :confirm-label="confirmLabel"
    :cancel-label="cancelLabel"
    :confirm-color="confirmColor"
    :loading="loading"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <slot />
  </UiPrompt>
</template>

<script setup>
defineProps({
  isOpen: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm' },
  icon: { type: String, default: null },
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  confirmColor: { type: String, default: 'primary' },
  loading: { type: Boolean, default: false },
})

defineEmits(['close', 'confirm'])
</script>

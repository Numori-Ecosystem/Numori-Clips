<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="max-h-0 opacity-0"
    enter-to-class="max-h-24 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="max-h-24 opacity-100"
    leave-to-class="max-h-0 opacity-0"
  >
    <div
      v-if="visible"
      class="flex-shrink-0 overflow-hidden bg-blue-600 dark:bg-blue-700 text-white text-xs font-medium cursor-pointer"
      :style="{ paddingTop: 'env(safe-area-inset-top, 0px)' }"
      role="status"
      @click="$emit('click')"
    >
      <div class="flex items-center justify-center gap-2 px-4 py-1.5">
        <Icon name="mdi:email-alert-outline" class="w-3.5 h-3.5 flex-shrink-0" />
        <span>Your email is not verified — tap here to verify</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
})

defineEmits(['click'])
</script>

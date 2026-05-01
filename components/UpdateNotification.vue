<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-4"
  >
    <div
      v-if="visible"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
      :class="
        isNative
          ? 'flex flex-col items-center gap-2 px-5 py-4 max-w-[15rem]'
          : 'flex items-center gap-3 pl-4 pr-10 py-3 max-w-sm'
      "
      :style="{ marginTop: 'env(safe-area-inset-top, 0px)' }"
      role="alert"
    >
      <!-- Dismiss (top-right corner) -->
      <UiButton
        variant="ghost"
        color="gray"
        icon-only
        class="absolute top-2 right-2"
        title="Dismiss"
        @click="$emit('dismiss')"
      >
        <Icon name="mdi:close" class="w-4 h-4" />
      </UiButton>

      <!-- Web: horizontal row -->
      <template v-if="!isNative">
        <Icon
          name="mdi:update"
          class="w-5 h-5 flex-shrink-0 text-primary-600 dark:text-primary-400"
        />
        <p class="text-sm text-gray-700 dark:text-gray-300 flex-1">A new version is available.</p>
        <UiButton
          variant="solid"
          color="primary"
          size="xs"
          class="flex-shrink-0"
          @click="$emit('apply')"
        >
          Reload
        </UiButton>
      </template>

      <!-- Native: vertical stack -->
      <template v-else>
        <Icon name="mdi:update" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
        <p class="text-sm text-gray-700 dark:text-gray-300 text-center">
          A new version is available in the store.
        </p>
        <UiButton variant="solid" color="primary" block @click="$emit('apply')"> Update </UiButton>
      </template>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  isNative: { type: Boolean, default: false },
})

defineEmits(['apply', 'dismiss'])
</script>

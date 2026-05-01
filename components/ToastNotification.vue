<template>
  <Teleport to="body">
    <div
      class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-250 ease-out"
        enter-from-class="opacity-0 -translate-y-3 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-y-1 scale-95"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium backdrop-blur-sm"
          :class="toastClass(toast.type)"
        >
          <Icon v-if="toast.icon" :name="toast.icon" class="w-4 h-4 flex-shrink-0" />
          <span>{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  toasts: { type: Array, default: () => [] },
})

const toastClass = (type) => {
  switch (type) {
    case 'success':
      return 'bg-green-600/90 text-white dark:bg-green-500/90'
    case 'warning':
      return 'bg-amber-500/90 text-white dark:bg-amber-500/90'
    case 'error':
      return 'bg-red-600/90 text-white dark:bg-red-500/90'
    default:
      return 'bg-gray-800/90 text-white dark:bg-gray-200/90 dark:text-gray-900'
  }
}
</script>

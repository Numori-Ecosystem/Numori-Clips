<template>
  <div class="mb-8 pb-4 border-b border-gray-200/60 dark:border-gray-700/40">
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/30">
        <Icon :name="icon" class="w-5 h-5 text-primary-500 dark:text-primary-400" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">{{ title }}</h3>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

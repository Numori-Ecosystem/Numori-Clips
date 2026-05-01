<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925 overscroll-none">
    <AuthPage />
  </div>
</template>

<script setup>
import { useThemeSync } from '~/composables/useThemeSync'

definePageMeta({ layout: false })

useThemeSync()
</script>

<template>
  <UiButton
    variant="ghost"
    color="gray"
    icon-only
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <Icon v-if="isDark" name="mdi:weather-sunny" class="w-5 h-5 block" />
    <Icon v-else name="mdi:weather-night" class="w-5 h-5 block" />
  </UiButton>
</template>

<script setup>
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

const toggleTheme = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <!-- Horizontal row of compact dropdown actions displayed side by side -->
  <div class="flex items-center mx-2 my-1 rounded-lg bg-gray-50 dark:bg-gray-700/40 overflow-hidden">
    <slot />
  </div>
</template>

<script setup>
/**
 * UiDropdownRow — Horizontal container for placing dropdown actions side by side.
 *
 * Wraps child elements in a compact, rounded row with a tinted background.
 * Children should use variant="menu-item" with flex-1 and justify-center
 * for balanced, centered layout. A UiDivider with direction="vertical"
 * works well between items.
 *
 * @example Two actions side by side
 * <UiDropdownRow>
 *   <UiButton variant="menu-item" class="flex-1 justify-center" @click="lock">
 *     <Icon name="mdi:lock" class="w-4 h-4" />
 *     Lock
 *   </UiButton>
 *   <UiDivider direction="vertical" />
 *   <UiButton variant="menu-item" color="red" class="flex-1 justify-center" @click="signOut">
 *     <Icon name="mdi:logout" class="w-4 h-4" />
 *     Sign Out
 *   </UiButton>
 * </UiDropdownRow>
 *
 * @slot default — Action buttons (and optional dividers) to lay out horizontally
 *
 * @see UiDropdown — Parent dropdown container
 * @see UiDropdownItem — Standard single-row dropdown item
 */
</script>

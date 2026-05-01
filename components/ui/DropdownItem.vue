<template>
  <!-- Menu item row: icon + label + optional shortcut -->
  <UiButton
    variant="menu-item"
    :color="color"
    :disabled="disabled"
    @click="!disabled && $emit('click')"
  >
    <Icon :name="icon" class="w-4 h-4 block flex-shrink-0" />
    <span class="flex-1 text-left">{{ label }}</span>
    <span v-if="shortcut" class="text-xs text-gray-400 dark:text-gray-500">{{ shortcut }}</span>
  </UiButton>
</template>

<script setup>
/**
 * UiDropdownItem — Single menu item row for use inside UiDropdown.
 *
 * Renders a UiButton with `variant="menu-item"` containing an icon, label,
 * and optional keyboard shortcut hint. Supports disabled state and destructive
 * (red) color for dangerous actions like delete.
 *
 * @example Standard menu item
 * <UiDropdownItem icon="mdi:pencil" label="Edit" @click="edit" />
 *
 * @example Destructive item with shortcut
 * <UiDropdownItem icon="mdi:trash-can-outline" label="Delete" color="red" shortcut="⌫" @click="del" />
 *
 * @example Disabled item
 * <UiDropdownItem icon="mdi:lock" label="Locked" disabled />
 *
 * @emits {void} click — Emitted when the item is clicked (unless disabled)
 *
 * @see UiDropdown — Parent dropdown container
 */
defineProps({
  /**
   * MDI icon name displayed at the start of the row.
   * @type {string}
   * @required
   */
  icon: { type: String, required: true },

  /**
   * Text label for the menu item.
   * @type {string}
   * @required
   */
  label: { type: String, required: true },

  /**
   * Optional keyboard shortcut hint displayed on the right side.
   * @type {string}
   * @default ''
   */
  shortcut: { type: String, default: '' },

  /**
   * Disabled state — dims the item and prevents click events.
   * @type {boolean}
   * @default false
   */
  disabled: { type: Boolean, default: false },

  /**
   * Color theme for the item text and hover background.
   * Use 'red' for destructive actions.
   * @type {string}
   * @default 'gray'
   * @values 'gray' | 'red' | 'green' | 'amber'
   */
  color: { type: String, default: 'gray' },
})

defineEmits(['click'])
</script>

<template>
  <div ref="containerRef" class="relative" :class="!block ? 'inline-block' : ''">
    <!-- Hidden sizer: measures the widest option label so the trigger never shrinks below it -->
    <div ref="sizerRef" aria-hidden="true" class="invisible absolute h-0 overflow-hidden pointer-events-none whitespace-nowrap" :class="sizerTextClass">
      <span v-for="opt in normalizedOptions" :key="opt.value" class="block">
        <span class="inline-flex items-center gap-2">
          <span v-if="opt.icon" class="w-4" />
          {{ opt.label }}
          <!-- account for chevron + padding -->
          <span class="w-4" />
        </span>
      </span>
    </div>

    <!-- Trigger button: shows selected value, placeholder, or loading spinner -->
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled || loading"
      :aria-label="ariaLabel"
      :class="[triggerClasses, disabled || loading ? 'opacity-50 cursor-not-allowed' : '']"
      :style="autoMinWidth"
      @click="toggleOpen"
    >
      <span
        v-if="loading"
        class="flex items-center gap-2 truncate text-gray-400 dark:text-gray-500"
      >
        <Icon :name="spinner" class="w-4 h-4 animate-spin flex-shrink-0" />
        <span>{{ loadingText }}</span>
      </span>
      <template v-else>
        <span
          class="flex items-center gap-2 truncate"
          :class="selectedLabel ? '' : 'text-gray-400 dark:text-gray-500'"
        >
          <Icon v-if="selectedIcon" :name="selectedIcon" class="w-4 h-4 flex-shrink-0" />
          {{ selectedLabel || placeholder || 'Select...' }}
        </span>
      </template>
      <Icon
        name="mdi:chevron-down"
        class="w-4 h-4 flex-shrink-0 text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropdown panel: animated scale transition -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-show="isOpen"
        class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
        :class="[dropUp ? 'bottom-full mb-1 mt-0' : '', block ? 'w-full' : 'min-w-full right-0']"
      >
        <!-- Search input for filtering options -->
        <div v-if="searchable" class="p-1.5">
          <input
            ref="searchRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            class="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-300 outline-none focus:ring-1 focus:ring-primary-500 placeholder-gray-400"
            @keydown.escape="close"
            @keydown.enter.prevent="selectFirst"
          >
        </div>
        <!-- Options list: ungrouped flat list or grouped sections -->
        <ul class="max-h-64 overflow-y-auto py-1">
          <li
            v-if="filteredOptions.length === 0 && filteredGroups.length === 0"
            class="px-3 py-2 text-sm text-gray-400 dark:text-gray-500"
          >
            No results
          </li>

          <!-- Ungrouped options -->
          <template v-if="filteredGroups.length === 0">
            <li
              v-for="opt in filteredOptions"
              :key="opt.value"
              class="flex items-center gap-2 px-3 cursor-pointer transition-colors"
              :class="[optionClass(opt.value), opt.subtitle ? 'py-1.5' : 'py-1.5']"
              @click="select(opt.value)"
            >
              <Icon v-if="opt.icon" :name="opt.icon" class="w-4 h-4 flex-shrink-0" />
              <div class="min-w-0">
                <span class="block truncate text-sm">{{ opt.label }}</span>
                <span v-if="opt.subtitle" class="block truncate text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{{ opt.subtitle }}</span>
              </div>
            </li>
          </template>

          <!-- Grouped options -->
          <template v-else>
            <template v-for="group in filteredGroups" :key="group.label">
              <li
                class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none"
              >
                {{ group.label }}
              </li>
              <li
                v-for="opt in group.options"
                :key="opt.value"
                class="flex items-center gap-2 px-3 cursor-pointer transition-colors"
                :class="[optionClass(opt.value), opt.subtitle ? 'py-1.5' : 'py-1.5']"
                @click="select(opt.value)"
              >
                <Icon v-if="opt.icon" :name="opt.icon" class="w-4 h-4 flex-shrink-0" />
                <div class="min-w-0">
                  <span class="block truncate text-sm">{{ opt.label }}</span>
                  <span v-if="opt.subtitle" class="block truncate text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{{ opt.subtitle }}</span>
                </div>
              </li>
            </template>
          </template>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<script setup>
/**
 * UiSelect — Custom dropdown select component with search, grouping, icons, and loading state.
 *
 * Renders a styled trigger button that opens a dropdown panel with filterable options.
 * Supports flat option lists and grouped options (via `group` key on option objects).
 * Includes keyboard navigation (Escape to close, Enter to select first match),
 * automatic drop-up when near the bottom of the viewport, and a loading spinner state.
 *
 * @example Basic select
 * <UiSelect v-model="color" :options="['Red', 'Green', 'Blue']" placeholder="Pick a color" />
 *
 * @example Searchable select with object options
 * <UiSelect v-model="lang" :options="[{ value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }]" searchable />
 *
 * @example Grouped options with icons
 * <UiSelect v-model="tool" :options="[
 *   { value: 'pen', label: 'Pen', icon: 'mdi:pen', group: 'Drawing' },
 *   { value: 'eraser', label: 'Eraser', icon: 'mdi:eraser', group: 'Drawing' },
 *   { value: 'text', label: 'Text', icon: 'mdi:format-text', group: 'Insert' },
 * ]" searchable />
 *
 * @example Loading state
 * <UiSelect v-model="val" :options="[]" :loading="true" loading-text="Fetching..." />
 *
 * @emits {string | number | boolean} update:modelValue — Emitted when an option is selected
 */
const props = defineProps({
  /**
   * Currently selected value (v-model).
   * @type {string | number | boolean | null}
   * @default ''
   */
  modelValue: { type: [String, Number, Boolean, null], default: '' },

  /**
   * Array of selectable options. Each item can be:
   * - A primitive (string/number) used as both value and label
   * - An object: `{ value, label, icon?, group? }`
   * @type {Array}
   * @default []
   */
  options: { type: Array, default: () => [] },

  /**
   * Placeholder text shown when no option is selected.
   * @type {string}
   * @default ''
   */
  placeholder: { type: String, default: '' },

  /**
   * Enable a search input inside the dropdown for filtering options.
   * @type {boolean}
   * @default false
   */
  searchable: { type: Boolean, default: false },

  /**
   * Disabled state — dims the trigger and prevents opening.
   * @type {boolean}
   * @default false
   */
  disabled: { type: Boolean, default: false },

  /**
   * Trigger button size controlling padding and font.
   * @type {string}
   * @default 'md'
   * @values 'xs' | 'sm' | 'md'
   */
  size: { type: String, default: 'md' },

  /**
   * Full-width mode — trigger stretches to fill its container.
   * @type {boolean}
   * @default true
   */
  block: { type: Boolean, default: true },

  /**
   * Accessible label for the trigger button.
   * @type {string}
   * @default undefined
   */
  ariaLabel: { type: String, default: undefined },

  /**
   * Loading state — shows a spinner and disables interaction.
   * @type {boolean}
   * @default false
   */
  loading: { type: Boolean, default: false },

  /**
   * Text displayed next to the spinner during loading.
   * @type {string}
   * @default 'Loading...'
   */
  loadingText: { type: String, default: 'Loading...' },

  /**
   * MDI icon name for the loading spinner.
   * @type {string}
   * @default 'mdi:loading'
   */
  spinner: { type: String, default: 'mdi:loading' },
})

const emit = defineEmits(['update:modelValue'])

const containerRef = ref(null)
const triggerRef = ref(null)
const searchRef = ref(null)
const sizerRef = ref(null)
const isOpen = ref(false)
const searchQuery = ref('')
const dropUp = ref(false)
const measuredWidth = ref(0)

// Text class for the hidden sizer — must match the trigger's font size
const sizerTextClass = computed(() => {
  const map = { xs: 'text-xs', sm: 'text-sm', md: 'text-sm' }
  return map[props.size] || 'text-sm'
})

// Measure the widest option on mount and when options change
const measureSizer = () => {
  if (!sizerRef.value) { measuredWidth.value = 0; return }
  measuredWidth.value = sizerRef.value.scrollWidth
}

onMounted(measureSizer)
watch(() => props.options, () => nextTick(measureSizer), { deep: true })

// Auto min-width style: ensures trigger never shrinks below the widest option
const autoMinWidth = computed(() => {
  if (!measuredWidth.value) return undefined
  // Add padding for the trigger's horizontal padding + border
  const padMap = { xs: 28, sm: 24, md: 30 }
  const pad = padMap[props.size] || 30
  return { minWidth: `${measuredWidth.value + pad}px` }
})

// ── Normalize options ────────────────────────────────────
// Convert primitive options (string/number) into { value, label, subtitle, icon, group } objects
const normalizedOptions = computed(() =>
  props.options.map((opt) =>
    typeof opt === 'object' && opt !== null
      ? {
          value: opt.value,
          label: opt.label ?? String(opt.value),
          subtitle: opt.subtitle || '',
          icon: opt.icon || '',
          group: opt.group || '',
        }
      : { value: opt, label: String(opt), subtitle: '', icon: '', group: '' },
  ),
)

// ── Filtering ────────────────────────────────────────────
// Apply search query filter against option labels (case-insensitive)
const filteredNormalized = computed(() => {
  if (!searchQuery.value) return normalizedOptions.value
  const q = searchQuery.value.toLowerCase()
  return normalizedOptions.value.filter((opt) =>
    opt.label.toLowerCase().includes(q) || opt.subtitle.toLowerCase().includes(q),
  )
})

// ── Grouping ─────────────────────────────────────────────
// Detect if any option has a group key to enable grouped rendering
const hasGroups = computed(() => normalizedOptions.value.some((o) => o.group))

// Build grouped structure: Map<groupLabel, { label, options[] }>
const filteredGroups = computed(() => {
  if (!hasGroups.value) return []
  const map = new Map()
  for (const opt of filteredNormalized.value) {
    const key = opt.group || ''
    if (!map.has(key)) map.set(key, { label: key, options: [] })
    map.get(key).options.push(opt)
  }
  return [...map.values()].filter((g) => g.options.length > 0)
})

const filteredOptions = computed(() => {
  if (hasGroups.value) return []
  return filteredNormalized.value
})

// ── Selected display ─────────────────────────────────────
const selectedOpt = computed(() =>
  normalizedOptions.value.find((o) => o.value === props.modelValue),
)
const selectedLabel = computed(() => selectedOpt.value?.label || '')
const selectedIcon = computed(() => selectedOpt.value?.icon || '')

// ── Styling ──────────────────────────────────────────────
const triggerClasses = computed(() => {
  const base =
    'flex items-center justify-between gap-2 text-left border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-400 outline-none transition-colors focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
  const width = props.block ? 'w-full' : ''
  const sizeMap = {
    xs: 'px-2.5 py-1.5 text-xs rounded-md border-gray-200 dark:border-gray-700',
    sm: 'px-2 py-1 text-sm rounded-lg border-gray-300 dark:border-gray-600',
    md: 'px-3 py-2 text-sm rounded-lg border-gray-300 dark:border-gray-700',
  }
  return `${base} ${width} ${sizeMap[props.size] || sizeMap.md}`
})

const optionClass = (value) =>
  props.modelValue === value
    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'

// ── Interactions ─────────────────────────────────────────
// Toggle dropdown open/close, auto-detect drop direction, and focus search input
const toggleOpen = () => {
  if (props.disabled || props.loading) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
    nextTick(() => {
      if (containerRef.value) {
        const rect = containerRef.value.getBoundingClientRect()
        dropUp.value = rect.bottom + 220 > window.innerHeight
      }
      if (props.searchable) searchRef.value?.focus()
    })
  }
}

const select = (value) => {
  emit('update:modelValue', value)
  close()
}

const selectFirst = () => {
  const pool = hasGroups.value
    ? filteredGroups.value.flatMap((g) => g.options)
    : filteredOptions.value
  if (pool.length) select(pool[0].value)
}

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
}

// Programmatic toggle for parent row clicks.
// Uses a skip flag to prevent the race with the document click handler:
// when the row is clicked, the capture-phase listener fires first (closing the dropdown),
// then the row handler calls toggle(). The flag lets us detect this and skip the re-open.
let skipNextOpen = false
const toggle = () => {
  if (props.disabled || props.loading) return
  if (skipNextOpen) { skipNextOpen = false; return }
  toggleOpen()
}

const closeFromOutside = () => {
  if (isOpen.value) skipNextOpen = true
  close()
  setTimeout(() => { skipNextOpen = false }, 0)
}

const onDocumentClick = (e) => {
  if (!containerRef.value || containerRef.value.contains(e.target)) return
  closeFromOutside()
}

onMounted(() => document.addEventListener('click', onDocumentClick, true))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick, true))

defineExpose({ toggle, close, isOpen })
</script>

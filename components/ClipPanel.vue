<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- ── Toolbar ────────────────────────────────────────────────────── -->
    <div class="flex-shrink-0 px-4 pt-3 pb-2 space-y-2.5">
      <!-- Search row -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Icon
            name="mdi:magnify"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
          />
          <input
            ref="searchInputRef"
            v-model="clipboard.searchQuery.value"
            type="text"
            placeholder="Search clips…"
            class="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 dark:focus:ring-primary-500/50 dark:focus:border-primary-500 outline-none transition-all"
            @keydown.escape="handleEscape"
          />
          <button
            v-if="clipboard.searchQuery.value"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear search"
            @click="clearSearch"
          >
            <Icon name="mdi:close-circle" class="w-4 h-4" />
          </button>
        </div>

        <!-- Right-side action buttons -->
        <button
          class="p-2 rounded-xl border transition-all"
          :class="
            clipboard.showFavoritesOnly.value
              ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-500'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-400'
          "
          :title="clipboard.showFavoritesOnly.value ? 'Show all' : 'Favorites only'"
          @click="clipboard.showFavoritesOnly.value = !clipboard.showFavoritesOnly.value"
        >
          <Icon :name="clipboard.showFavoritesOnly.value ? 'mdi:star' : 'mdi:star-outline'" class="w-4 h-4" />
        </button>

        <button
          class="p-2 rounded-xl border transition-all"
          :class="
            clipboard.incognitoMode.value
              ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-500'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          "
          :title="clipboard.incognitoMode.value ? 'Incognito ON' : 'Incognito OFF'"
          @click="toggleIncognito"
        >
          <Icon :name="clipboard.incognitoMode.value ? 'mdi:eye-off' : 'mdi:eye-off-outline'" class="w-4 h-4" />
        </button>
      </div>

      <!-- Type filter row -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
          :class="
            !clipboard.activeTypeFilter.value
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          "
          @click="clipboard.activeTypeFilter.value = null"
        >
          All
          <span class="text-[10px] opacity-70">{{ clipboard.clipCount.value }}</span>
        </button>
        <button
          v-for="filter in typeFilters"
          :key="filter.type"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
          :class="
            clipboard.activeTypeFilter.value === filter.type
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          "
          @click="toggleTypeFilter(filter.type)"
        >
          <Icon :name="filter.icon" class="w-3.5 h-3.5" />
          {{ filter.label }}
          <span v-if="clipboard.typeCounts.value[filter.type]" class="text-[10px] opacity-70">
            {{ clipboard.typeCounts.value[filter.type] }}
          </span>
        </button>
      </div>
    </div>

    <!-- ── Clip list (horizontal scroll) ──────────────────────────────── -->
    <div
      ref="scrollContainerRef"
      class="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4"
      role="listbox"
      aria-label="Clipboard history"
      tabindex="0"
      @keydown="onKeydown"
    >
      <!-- Incognito banner -->
      <div
        v-if="clipboard.incognitoMode.value"
        class="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
      >
        <Icon name="mdi:eye-off" class="w-4 h-4 text-primary-500 flex-shrink-0" />
        <p class="text-xs text-primary-700 dark:text-primary-300">
          Incognito mode — clipboard activity is not being recorded
        </p>
      </div>

      <!-- Empty state -->
      <div
        v-if="!clipboard.isLoading.value && clipboard.filteredClips.value.length === 0"
        class="flex items-center justify-center h-full"
      >
        <div class="text-center space-y-4 max-w-xs">
          <div class="mx-auto w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Icon :name="emptyStateIcon" class="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <div class="space-y-1.5">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ emptyStateTitle }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{{ emptyStateSubtitle }}</p>
          </div>
        </div>
      </div>

      <!-- Horizontal clip list -->
      <div
        v-else
        class="flex gap-3 h-full items-stretch"
      >
        <ClipCard
          v-for="clip in clipboard.filteredClips.value"
          :key="clip.id"
          ref="clipCardRefs"
          :clip="clip"
          :is-selected="selectedClipId === clip.id"
          @copy="handleCopy"
          @delete="handleDelete"
          @toggle-favorite="clipboard.toggleFavorite"
        />
      </div>
    </div>

    <!-- ── Status bar ─────────────────────────────────────────────────── -->
    <div class="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-1.5 flex items-center justify-between">
      <div class="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
        <span>{{ clipboard.filteredClips.value.length }} clip{{ clipboard.filteredClips.value.length !== 1 ? 's' : '' }}</span>
        <span v-if="clipboard.activeTypeFilter.value" class="flex items-center gap-1">
          · filtered by <strong class="font-medium">{{ clipboard.activeTypeFilter.value }}</strong>
        </span>
      </div>
      <div class="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
        <span class="flex items-center gap-1">
          <UiKbd size="xs">←</UiKbd><UiKbd size="xs">→</UiKbd> navigate
        </span>
        <span class="flex items-center gap-1">
          <UiKbd size="xs">Enter</UiKbd> copy
        </span>
        <span class="flex items-center gap-1">
          <UiKbd size="xs">Esc</UiKbd> dismiss
        </span>
        <button
          v-if="clipboard.clipCount.value > 0"
          class="text-[10px] text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          @click="confirmClearAll"
        >
          Clear all
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useClipboard } from '~/composables/useClipboard'

const clipboard = useClipboard()
const toast = useToast()

const emit = defineEmits(['dismiss'])

const searchInputRef = ref(null)
const scrollContainerRef = ref(null)
const clipCardRefs = ref([])
const selectedClipId = ref(null)

// ── Type filters ─────────────────────────────────────────────────────────
const typeFilters = [
  { type: 'text',  icon: 'mdi:text',             label: 'Text' },
  { type: 'link',  icon: 'mdi:link-variant',     label: 'Links' },
  { type: 'image', icon: 'mdi:image-outline',    label: 'Images' },
  { type: 'code',  icon: 'mdi:code-tags',        label: 'Code' },
  { type: 'color', icon: 'mdi:palette',          label: 'Colors' },
  { type: 'emoji', icon: 'mdi:emoticon-outline', label: 'Emoji' },
  { type: 'file',  icon: 'mdi:file-outline',     label: 'Files' },
]

function toggleTypeFilter(type) {
  clipboard.activeTypeFilter.value = clipboard.activeTypeFilter.value === type ? null : type
}

// ── Empty state ──────────────────────────────────────────────────────────
const emptyStateIcon = computed(() => {
  if (clipboard.searchQuery.value) return 'mdi:magnify'
  if (clipboard.showFavoritesOnly.value) return 'mdi:star-outline'
  if (clipboard.activeTypeFilter.value) return 'mdi:filter-outline'
  if (clipboard.incognitoMode.value) return 'mdi:eye-off-outline'
  return 'mdi:clipboard-text-outline'
})

const emptyStateTitle = computed(() => {
  if (clipboard.searchQuery.value) return 'No matching clips'
  if (clipboard.showFavoritesOnly.value) return 'No favorites yet'
  if (clipboard.activeTypeFilter.value) return `No ${clipboard.activeTypeFilter.value} clips`
  if (clipboard.incognitoMode.value) return 'Incognito mode active'
  return 'No clips yet'
})

const emptyStateSubtitle = computed(() => {
  if (clipboard.searchQuery.value) return 'Try a different search term'
  if (clipboard.showFavoritesOnly.value) return 'Star clips to see them here'
  if (clipboard.incognitoMode.value) return 'New clipboard activity won\'t be saved'
  return 'Start copying things — they\'ll show up here'
})

// ── Actions ──────────────────────────────────────────────────────────────
function clearSearch() {
  clipboard.searchQuery.value = ''
  searchInputRef.value?.focus()
}

function handleEscape() {
  if (clipboard.searchQuery.value) {
    clearSearch()
  } else {
    emit('dismiss')
  }
}

async function handleCopy(clip) {
  const ok = await clipboard.copyToClipboard(clip)
  if (ok) {
    toast.show('Copied to clipboard', { type: 'success', icon: 'mdi:check', duration: 1500 })
    emit('dismiss')
  }
}

function handleDelete(id) {
  const clips = clipboard.filteredClips.value
  const idx = clips.findIndex((c) => c.id === id)
  clipboard.deleteClip(id)
  if (clips.length > 1) {
    const nextIdx = idx < clips.length - 1 ? idx : idx - 1
    selectedClipId.value = clips[nextIdx]?.id ?? null
  } else {
    selectedClipId.value = null
  }
}

function confirmClearAll() {
  clipboard.clearAll()
  toast.show('All clips cleared', { type: 'info', icon: 'mdi:delete-sweep-outline', duration: 2000 })
}

function toggleIncognito() {
  clipboard.incognitoMode.value = !clipboard.incognitoMode.value
  if (globalThis.window?.electronAPI?.setIncognito) {
    globalThis.window.electronAPI.setIncognito(clipboard.incognitoMode.value)
  }
  toast.show(
    clipboard.incognitoMode.value ? 'Incognito mode on' : 'Incognito mode off',
    { type: 'info', icon: clipboard.incognitoMode.value ? 'mdi:eye-off' : 'mdi:eye-outline', duration: 1500 },
  )
}

// ── Keyboard navigation (horizontal) ────────────────────────────────────
function onKeydown(e) {
  const clips = clipboard.filteredClips.value
  if (!clips.length) return

  const currentIdx = clips.findIndex((c) => c.id === selectedClipId.value)

  switch (e.key) {
    case 'ArrowRight': {
      e.preventDefault()
      const nextIdx = currentIdx < clips.length - 1 ? currentIdx + 1 : 0
      selectedClipId.value = clips[nextIdx].id
      scrollToCard(nextIdx)
      break
    }
    case 'ArrowLeft': {
      e.preventDefault()
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : clips.length - 1
      selectedClipId.value = clips[prevIdx].id
      scrollToCard(prevIdx)
      break
    }
    case 'Enter': {
      e.preventDefault()
      if (currentIdx >= 0) handleCopy(clips[currentIdx])
      break
    }
    case 'Delete': {
      e.preventDefault()
      if (currentIdx >= 0) handleDelete(clips[currentIdx].id)
      break
    }
    case 'Escape': {
      e.preventDefault()
      emit('dismiss')
      break
    }
    case '/': {
      e.preventDefault()
      searchInputRef.value?.focus()
      break
    }
  }
}

function scrollToCard(idx) {
  nextTick(() => {
    const cards = clipCardRefs.value
    if (cards?.[idx]?.el) {
      cards[idx].el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  })
}

// ── Tray actions ─────────────────────────────────────────────────────────
onMounted(() => {
  if (globalThis.window?.electronAPI?.onTrayAction) {
    globalThis.window.electronAPI.onTrayAction((data) => {
      if (data.action === 'incognito-toggled') {
        clipboard.incognitoMode.value = data.value
      }
      if (data.action === 'toggle-panel') {
        nextTick(() => searchInputRef.value?.focus())
      }
    })
  }
})

defineExpose({
  focusSearch: () => searchInputRef.value?.focus(),
})
</script>

<style scoped>
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>

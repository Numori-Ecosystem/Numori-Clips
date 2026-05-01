<template>
  <div
    ref="cardRef"
    class="group relative rounded-xl border transition-all duration-150 cursor-pointer select-none overflow-hidden flex-shrink-0 w-64 flex flex-col"
    :class="[
      isSelected
        ? 'border-primary-400 dark:border-primary-500 ring-2 ring-primary-400/20 dark:ring-primary-500/20 shadow-card-hover'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-card-hover',
      'bg-white dark:bg-gray-800',
    ]"
    tabindex="0"
    :aria-label="`${clip.type} clip: ${clip.title}`"
    role="option"
    :aria-selected="isSelected"
    @click="$emit('copy', clip)"
    @keydown.enter.prevent="$emit('copy', clip)"
    @keydown.delete.prevent="$emit('delete', clip.id)"
  >
    <!-- Card body -->
    <div class="p-2.5 flex flex-col flex-1 min-h-0">
      <!-- Header row: type badge + time + actions -->
      <div class="flex items-center gap-2 mb-1.5">
        <span
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
          :class="typeBadgeClasses"
        >
          <Icon :name="typeIcon" class="w-3 h-3" />
          {{ typeLabel }}
        </span>

        <span class="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
          {{ timeAgo }}
        </span>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Actions (always visible on selected, hover otherwise) -->
        <div
          class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          :class="{ '!opacity-100': isSelected }"
        >
          <button
            class="p-1 rounded-md transition-colors"
            :class="clip.favorite
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-gray-300 dark:text-gray-600 hover:text-amber-500 dark:hover:text-amber-400'"
            :title="clip.favorite ? 'Unfavorite' : 'Favorite'"
            @click.stop="$emit('toggle-favorite', clip.id)"
          >
            <Icon :name="clip.favorite ? 'mdi:star' : 'mdi:star-outline'" class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 rounded-md text-gray-300 dark:text-gray-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            title="Copy"
            @click.stop="$emit('copy', clip)"
          >
            <Icon name="mdi:content-copy" class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 rounded-md text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Delete"
            @click.stop="$emit('delete', clip.id)"
          >
            <Icon name="mdi:delete-outline" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Content preview -->
      <!-- Image -->
      <div v-if="clip.type === 'image'" class="flex-1 min-h-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
        <!-- SVG content: render inline via data URI -->
        <img
          v-if="clip.meta?.svg"
          :src="svgDataUrl"
          alt="SVG image"
          class="w-full h-full object-contain"
          loading="lazy"
        />
        <!-- Data URL / binary image (including converted file paths) -->
        <img
          v-else
          :src="clip.content"
          alt="Clipboard image"
          class="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      <!-- Color -->
      <div v-else-if="clip.type === 'color'" class="flex-1 min-h-0 flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 shadow-inner flex-shrink-0"
          :style="{ backgroundColor: clip.meta?.hex || clip.content }"
        />
        <span class="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">
          {{ clip.content.trim() }}
        </span>
      </div>

      <!-- Emoji -->
      <div v-else-if="clip.type === 'emoji'" class="flex-1 min-h-0 flex items-center py-1">
        <span class="text-3xl leading-none">{{ clip.content.trim() }}</span>
      </div>

      <!-- Link -->
      <div v-else-if="clip.type === 'link'" class="flex-1 min-h-0 space-y-1">
        <p class="text-xs font-medium text-primary-500 dark:text-primary-400 truncate">
          {{ clip.meta?.domain || 'Link' }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 break-all leading-relaxed overflow-hidden">
          {{ clip.content.trim() }}
        </p>
      </div>

      <!-- Code (syntax highlighted) -->
      <div v-else-if="clip.type === 'code'" class="flex-1 min-h-0 flex flex-col">
        <div class="flex items-center justify-between mb-1">
          <span
            v-if="clip.meta?.language && clip.meta.language !== 'plaintext'"
            class="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1"
          >
            {{ languageDisplayName }}
          </span>
        </div>
        <pre
          class="code-highlight text-[11px] leading-relaxed font-mono overflow-hidden whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 rounded-lg p-2 -mx-0.5 flex-1"
        ><code v-html="highlightedCode"></code></pre>
      </div>

      <!-- File -->
      <div v-else-if="clip.type === 'file'" class="flex-1 min-h-0 flex items-center gap-2">
        <Icon name="mdi:file-outline" class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{{ clip.title }}</p>
          <p class="text-[10px] text-gray-400 dark:text-gray-500 truncate">{{ clip.content.trim() }}</p>
        </div>
      </div>

      <!-- Text (default) -->
      <div v-else class="flex-1 min-h-0">
        <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words overflow-hidden h-full">{{ clip.preview }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { highlightCode, detectLanguageName } from '~/composables/useCodeHighlight.js'

const props = defineProps({
  clip: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
})

defineEmits(['select', 'copy', 'delete', 'toggle-favorite'])

const cardRef = ref(null)

const typeConfig = {
  text:  { icon: 'mdi:text',             label: 'Text',  badge: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
  link:  { icon: 'mdi:link-variant',     label: 'Link',  badge: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' },
  image: { icon: 'mdi:image-outline',    label: 'Image', badge: 'bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400' },
  code:  { icon: 'mdi:code-tags',        label: 'Code',  badge: 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400' },
  color: { icon: 'mdi:palette',          label: 'Color', badge: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' },
  emoji: { icon: 'mdi:emoticon-outline', label: 'Emoji', badge: 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400' },
  file:  { icon: 'mdi:file-outline',     label: 'File',  badge: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
}

const typeIcon = computed(() => typeConfig[props.clip.type]?.icon || 'mdi:text')
const typeLabel = computed(() => typeConfig[props.clip.type]?.label || 'Text')
const typeBadgeClasses = computed(() => typeConfig[props.clip.type]?.badge || typeConfig.text.badge)

// ── Image source helpers ─────────────────────────────────────────────────
const svgDataUrl = computed(() => {
  if (!props.clip.meta?.svg) return ''
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(props.clip.content)}`
})

// ── Code highlighting ────────────────────────────────────────────────────
const highlightedCode = computed(() => {
  if (props.clip.type !== 'code') return ''
  const code = props.clip.preview || props.clip.content || ''
  return highlightCode(code, props.clip.meta?.language)
})

const languageDisplayName = computed(() => {
  return detectLanguageName(props.clip.meta?.language)
})

// Relative time
const now = useNow({ interval: 30000 })

const timeAgo = computed(() => {
  const diff = now.value - props.clip.createdAt
  const seconds = Math.floor(diff / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
})

defineExpose({ el: cardRef })
</script>

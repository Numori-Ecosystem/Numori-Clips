<template>
  <!-- Clickable label wrapping a hidden file input — slot content acts as the visible trigger -->
  <label
    class="inline-flex items-center gap-2 cursor-pointer transition-colors"
    :class="disabled ? 'opacity-50 pointer-events-none' : ''"
  >
    <slot />
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="onChange"
    >
  </label>
</template>

<script setup>
/**
 * UiFileInput — Hidden file input wrapped in a clickable label for custom trigger UI.
 *
 * The default slot provides the visible trigger content (e.g. a button or icon).
 * Clicking anywhere in the label opens the native file picker. Supports file type
 * filtering via `accept`, multi-file selection, and max file size validation.
 * Exposes an `open()` method for programmatic triggering.
 *
 * @example Single image upload
 * <UiFileInput accept="image/*" @select="onFile">
 *   <UiButton variant="outline">Upload Image</UiButton>
 * </UiFileInput>
 *
 * @example Multiple files with size limit (5 MB)
 * <UiFileInput multiple :max-size="5 * 1024 * 1024" @select="onFiles" @error="onError">
 *   <span>Choose files</span>
 * </UiFileInput>
 *
 * @example Programmatic open via ref
 * <UiFileInput ref="fileInput" @select="onFile"><span>Pick</span></UiFileInput>
 * <!-- In script: fileInput.value.open() -->
 *
 * @emits {File | File[]} select — Emitted with the selected file(s) after validation passes
 * @emits {{ type: string, file: File, message: string }} error — Emitted when a file exceeds the maxSize limit
 *
 * @slot default — Trigger content (e.g. a button or icon) that opens the file picker
 */
const props = defineProps({
  /**
   * Accepted file types (MIME types or extensions), passed to the native `accept` attribute.
   * @type {string}
   * @default undefined
   * @example 'image/*', '.pdf,.doc', 'video/mp4'
   */
  accept: { type: String, default: undefined },

  /**
   * Allow selecting multiple files at once.
   * @type {boolean}
   * @default false
   */
  multiple: { type: Boolean, default: false },

  /**
   * Disabled state — dims the label and prevents file picker from opening.
   * @type {boolean}
   * @default false
   */
  disabled: { type: Boolean, default: false },

  /**
   * Maximum allowed file size in bytes. Set to 0 for no limit.
   * Emits an 'error' event with `{ type: 'maxSize', file, message }` when exceeded.
   * @type {number}
   * @default 0
   */
  maxSize: { type: Number, default: 0 },
})

const emit = defineEmits(['select', 'error'])

const inputRef = ref(null)

function onChange(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return

  if (props.maxSize > 0) {
    const oversized = files.find((f) => f.size > props.maxSize)
    if (oversized) {
      const maxMB = (props.maxSize / 1024 / 1024).toFixed(1)
      emit('error', { type: 'maxSize', file: oversized, message: `File exceeds ${maxMB} MB limit` })
      e.target.value = ''
      return
    }
  }

  emit('select', props.multiple ? files : files[0])
  e.target.value = ''
}

defineExpose({
  open: () => inputRef.value?.click(),
  el: inputRef,
})
</script>

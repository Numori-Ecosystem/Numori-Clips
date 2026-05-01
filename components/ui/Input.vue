<template>
  <div class="w-full">
    <div class="relative flex">
      <!-- Number stepper: minus button on left (both-sides layout) -->
      <button
        v-if="isNumber && stepperLayout === 'both-sides'"
        type="button"
        tabindex="-1"
        class="flex items-center justify-center w-9 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
        :class="{ 'opacity-50 pointer-events-none': disabled }"
        aria-label="Decrease value"
        @click="stepDown"
      >
        <Icon name="mdi:minus" class="w-4 h-4" />
      </button>

      <!-- Number stepper: stacked up/down buttons on left -->
      <div
        v-if="isNumber && stepperLayout === 'stacked-left'"
        class="flex flex-col w-6 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg overflow-hidden"
        :class="{ 'opacity-50 pointer-events-none': disabled }"
      >
        <button
          type="button"
          tabindex="-1"
          class="grid place-items-center w-4 flex-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none border-b border-gray-300 dark:border-gray-600"
          aria-label="Increase value"
          @click="stepUp"
        >
          <Icon name="mdi:chevron-up" class="block w-3 h-3" />
        </button>
        <button
          type="button"
          tabindex="-1"
          class="grid place-items-center w-4 flex-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
          aria-label="Decrease value"
          @click="stepDown"
        >
          <Icon name="mdi:chevron-down" class="block w-3 h-3" />
        </button>
      </div>

      <!-- Textarea mode: multi-line text input with custom scrollbar styling -->
      <textarea
        v-if="isTextarea"
        ref="inputRef"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :rows="rows"
        :maxlength="maxlength"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm transition-colors [scrollbar-width:thin] [scrollbar-color:theme(colors.gray.300)_transparent] dark:[scrollbar-color:theme(colors.gray.600)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500"
        :class="resizeClass"
        :style="textareaStyle"
        @input="onInput"
        @blur="onBlur"
      />

      <!-- The actual input element (text, number, password, email, phone) -->
      <!-- Left icon/image slot -->
      <span v-if="!isTextarea && ($slots.left || iconLeft)" class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
        <slot name="left">
          <Icon v-if="iconLeft" :name="iconLeft" class="w-4 h-4" />
        </slot>
      </span>

      <input
        v-if="!isTextarea"
        ref="inputRef"
        :type="computedType"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :minlength="minlength"
        :maxlength="maxlength"
        :inputmode="computedInputMode"
        :min="min"
        :max="max"
        :step="step"
        :pattern="pattern"
        class="w-full py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm transition-colors"
        :class="inputClasses"
        @input="onInput"
        @blur="onBlur"
        @keydown="onKeydown"
      >

      <!-- Right icon/image slot (hidden when clear button or password toggle is shown) -->
      <span v-if="!isTextarea && ($slots.right || iconRight) && !(clearable && modelValue) && !(isPassword && showToggle)" class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 dark:text-gray-500">
        <slot name="right">
          <Icon v-if="iconRight" :name="iconRight" class="w-4 h-4" />
        </slot>
      </span>

      <!-- Clear button -->
      <button
        v-if="clearable && modelValue"
        type="button"
        tabindex="-1"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Clear"
        @mousedown.prevent
        @click="emit('update:modelValue', '')"
      >
        <Icon name="mdi:close-circle" class="w-4 h-4" />
      </button>

      <!-- Password visibility toggle button -->
      <button
        v-if="isPassword && showToggle"
        type="button"
        tabindex="-1"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
        @mousedown.prevent
        @click="passwordVisible = !passwordVisible"
      >
        <Icon :name="passwordVisible ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="w-4 h-4" />
      </button>

      <!-- Number stepper: stacked up/down buttons on right -->
      <div
        v-if="isNumber && stepperLayout === 'stacked-right'"
        class="flex flex-col w-6 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg overflow-hidden"
        :class="{ 'opacity-50 pointer-events-none': disabled }"
      >
        <button
          type="button"
          tabindex="-1"
          class="grid place-items-center w-4 flex-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none border-b border-gray-300 dark:border-gray-600"
          aria-label="Increase value"
          @click="stepUp"
        >
          <Icon name="mdi:chevron-up" class="block w-3 h-3" />
        </button>
        <button
          type="button"
          tabindex="-1"
          class="grid place-items-center w-4 flex-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
          aria-label="Decrease value"
          @click="stepDown"
        >
          <Icon name="mdi:chevron-down" class="block w-3 h-3" />
        </button>
      </div>

      <!-- Number stepper: plus button on right (both-sides layout) -->
      <button
        v-if="isNumber && stepperLayout === 'both-sides'"
        type="button"
        tabindex="-1"
        class="flex items-center justify-center w-9 rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none"
        :class="{ 'opacity-50 pointer-events-none': disabled }"
        aria-label="Increase value"
        @click="stepUp"
      >
        <Icon name="mdi:plus" class="w-4 h-4" />
      </button>
    </div>

    <!-- Validation error message (shown after first blur) -->
    <p v-if="showError && validationError" class="text-xs text-red-600 dark:text-red-400 mt-1">
      {{ validationError }}
    </p>
  </div>
</template>

<script setup>
/**
 * UiInput — Multi-purpose input component supporting text, number, password, email,
 * phone, and textarea modes in a single unified interface.
 *
 * Features:
 * - Number mode with configurable stepper layouts (both-sides, stacked-left, stacked-right, none)
 * - Password mode with show/hide toggle
 * - Textarea mode with configurable resize, min/max dimensions
 * - Built-in validation for email, phone, and number patterns
 * - Custom regex validation with configurable error messages
 * - Exposes `focus()` method and `el` ref for parent control
 *
 * @example Basic text input
 * <UiInput v-model="name" placeholder="Enter your name" />
 *
 * @example Number input with min/max
 * <UiInput v-model="quantity" type="number" :min="0" :max="100" :step="1" />
 *
 * @example Password with toggle
 * <UiInput v-model="password" type="password" />
 *
 * @example Textarea
 * <UiInput v-model="bio" type="textarea" :rows="5" resize="vertical" />
 *
 * @example Email with validation
 * <UiInput v-model="email" type="email" :validate="true" />
 *
 * @emits {string | number} update:modelValue — Emitted when the input value changes (v-model)
 * @emits {{ valid: boolean, error: string | null }} validation — Emitted when the validation state changes
 */
const props = defineProps({
  /**
   * Bound value (v-model).
   * @type {string | number}
   * @default ''
   */
  modelValue: { type: [String, Number], default: '' },

  /**
   * Input type determining the mode and behavior.
   * @type {string}
   * @default 'text'
   * @values 'text' | 'number' | 'password' | 'email' | 'phone' | 'textarea'
   */
  type: { type: String, default: 'text' },

  /**
   * Placeholder text shown when the input is empty.
   * @type {string}
   * @default ''
   */
  placeholder: { type: String, default: '' },

  /**
   * Whether the field is required for form validation.
   * @type {boolean}
   * @default false
   */
  required: { type: Boolean, default: false },

  /**
   * Disabled state — dims the input and prevents interaction.
   * @type {boolean}
   * @default false
   */
  disabled: { type: Boolean, default: false },

  /**
   * Read-only state — allows focus/selection but prevents editing.
   * @type {boolean}
   * @default false
   */
  readonly: { type: Boolean, default: false },

  /**
   * HTML autocomplete attribute hint for the browser.
   * @type {string}
   * @default undefined
   */
  autocomplete: { type: String, default: undefined },

  /**
   * Minimum character length for text validation.
   * @type {number}
   * @default undefined
   */
  minlength: { type: Number, default: undefined },

  /**
   * Maximum character length for text validation.
   * @type {number}
   * @default undefined
   */
  maxlength: { type: Number, default: undefined },

  // ── Textarea-specific props ──

  /**
   * Number of visible text rows (textarea mode only).
   * @type {number}
   * @default 3
   */
  rows: { type: Number, default: 3 },

  /**
   * Resize behavior for textarea mode.
   * @type {string}
   * @default 'none'
   * @values 'none' | 'vertical' | 'horizontal' | 'both'
   */
  resize: { type: String, default: 'none' },

  /**
   * Minimum height CSS value for textarea (e.g. '80px', '5rem').
   * @type {string}
   * @default undefined
   */
  minHeight: { type: String, default: undefined },

  /**
   * Maximum height CSS value for textarea (e.g. '300px', '20rem').
   * @type {string}
   * @default undefined
   */
  maxHeight: { type: String, default: undefined },

  /**
   * Minimum width CSS value for textarea (e.g. '200px').
   * @type {string}
   * @default undefined
   */
  minWidth: { type: String, default: undefined },

  /**
   * Maximum width CSS value for textarea (e.g. '600px').
   * @type {string}
   * @default undefined
   */
  maxWidth: { type: String, default: undefined },

  /**
   * HTML pattern attribute for native form validation.
   * @type {string}
   * @default undefined
   */
  pattern: { type: String, default: undefined },

  // ── Password-specific props ──

  /**
   * Show the password visibility toggle button (password mode only).
   * @type {boolean}
   * @default true
   */
  showToggle: { type: Boolean, default: true },

  // ── Number-specific props ──

  /**
   * Minimum allowed numeric value.
   * @type {number}
   * @default undefined
   */
  min: { type: Number, default: undefined },

  /**
   * Maximum allowed numeric value.
   * @type {number}
   * @default undefined
   */
  max: { type: Number, default: undefined },

  /**
   * Step increment for number stepper buttons.
   * @type {number}
   * @default 1
   */
  step: { type: Number, default: 1 },

  /**
   * Layout of the +/- stepper buttons for number inputs.
   * @type {string}
   * @default 'both-sides'
   * @values 'stacked-left' | 'stacked-right' | 'both-sides' | 'none'
   */
  stepperLayout: { type: String, default: 'both-sides' },

  // ── Validation props ──

  /**
   * Show a clear button when the input has a value.
   * @type {boolean}
   * @default false
   */
  clearable: { type: Boolean, default: false },

  /**
   * Icon name to display on the left side of the input.
   * @type {string}
   * @default undefined
   */
  iconLeft: { type: String, default: undefined },

  /**
   * Icon name to display on the right side of the input.
   * @type {string}
   * @default undefined
   */
  iconRight: { type: String, default: undefined },

  /**
   * Enable built-in validation feedback shown below the input on blur.
   * @type {boolean}
   * @default true
   */
  validate: { type: Boolean, default: true },

  /**
   * Custom regex pattern string — overrides built-in type-based patterns.
   * @type {string}
   * @default undefined
   */
  validationPattern: { type: String, default: undefined },

  /**
   * Custom error message shown when validation fails.
   * @type {string}
   * @default undefined
   */
  validationMessage: { type: String, default: undefined },
})

const emit = defineEmits(['update:modelValue', 'validation'])

const inputRef = ref(null)
const passwordVisible = ref(false)
const touched = ref(false)

// --- Computed helpers ---

// Detect input mode from the type prop
const isPassword = computed(() => props.type === 'password')
const isNumber = computed(() => props.type === 'number')
const isTextarea = computed(() => props.type === 'textarea')

// Map resize prop to Tailwind resize utility class
const resizeClass = computed(() => {
  const map = { none: 'resize-none', vertical: 'resize-y', horizontal: 'resize-x', both: 'resize' }
  return map[props.resize] || 'resize-none'
})

const textareaStyle = computed(() => {
  const s = {}
  if (props.minHeight) s.minHeight = props.minHeight
  if (props.maxHeight) s.maxHeight = props.maxHeight
  if (props.minWidth) s.minWidth = props.minWidth
  if (props.maxWidth) s.maxWidth = props.maxWidth
  return s
})

// For number type, render as text input so we can filter keystrokes ourselves
const computedType = computed(() => {
  if (isPassword.value) return passwordVisible.value ? 'text' : 'password'
  if (isNumber.value) return 'text' // we handle number filtering ourselves
  if (props.type === 'phone') return 'tel'
  return props.type
})

// Set appropriate mobile keyboard via inputmode attribute
const computedInputMode = computed(() => {
  if (isNumber.value) return 'decimal'
  if (props.type === 'phone') return 'tel'
  if (props.type === 'email') return 'email'
  return undefined
})

const hasStepper = computed(() => isNumber.value && props.stepperLayout !== 'none')

const slots = useSlots()

const hasLeftIcon = computed(() => !!props.iconLeft || !!slots.left)
const hasRightIcon = computed(() => !!props.iconRight || !!slots.right)

const inputClasses = computed(() => {
  const classes = []

  // Horizontal padding — tighter when steppers are present
  if (hasStepper.value) {
    classes.push('px-1.5')
  } else {
    // Adjust padding for icons/slots
    classes.push(hasLeftIcon.value ? 'pl-9' : 'pl-3')
    classes.push(hasRightIcon.value ? 'pr-9' : 'pr-3')
  }

  // Rounding based on stepper layout
  if (hasStepper.value) {
    if (props.stepperLayout === 'both-sides') classes.push('rounded-none')
    else if (props.stepperLayout === 'stacked-left') classes.push('rounded-l-none', 'rounded-r-lg')
    else if (props.stepperLayout === 'stacked-right') classes.push('rounded-r-none', 'rounded-l-lg')
  } else {
    classes.push('rounded-lg')
  }

  // Extra right padding for password toggle
  if (isPassword.value && props.showToggle) classes.push('pr-10')

  // Extra right padding for clear button
  if (props.clearable) classes.push('pr-8')

  // Number text alignment
  if (isNumber.value && hasStepper.value) classes.push('text-center')

  return classes
})

// --- Validation ---

// Built-in regex patterns for common input types
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-().]{7,}$/,
  number: /^-?\d*\.?\d+$/,
}

const MESSAGES = {
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  number: 'Please enter a valid number',
}

const validationError = computed(() => {
  const val = String(props.modelValue ?? '')
  if (!val) return null

  // Custom pattern takes priority
  if (props.validationPattern) {
    const re = new RegExp(props.validationPattern)
    if (!re.test(val)) return props.validationMessage || 'Invalid format'
  }

  // Built-in patterns
  const builtIn = PATTERNS[props.type]
  if (builtIn && !builtIn.test(val)) {
    return props.validationMessage || MESSAGES[props.type] || 'Invalid input'
  }

  return null
})

const showError = computed(() => props.validate && touched.value)

watch(validationError, (err) => {
  emit('validation', { valid: !err, error: err })
})

// --- Event handlers ---

// Regex for validating partial number input (allows intermediate states like "-" or ".")
const NUMBER_ALLOWED = /^-?\d*\.?\d*$/

function onInput(e) {
  const val = e.target.value

  // For number type, reject non-numeric characters
  if (isNumber.value) {
    if (!NUMBER_ALLOWED.test(val)) {
      // Revert to previous valid value
      e.target.value = String(props.modelValue ?? '')
      return
    }
  }

  emit(
    'update:modelValue',
    isNumber.value && val !== '' && val !== '-' && val !== '.' && val !== '-.' ? Number(val) : val,
  )
}

function onBlur() {
  touched.value = true
}

function onKeydown(e) {
  if (!isNumber.value) return

  // Allow: backspace, delete, tab, escape, enter, arrows, home, end, decimal point, minus
  const allowed = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
  ]
  if (allowed.includes(e.key)) return
  if (e.key === '.' && !String(props.modelValue).includes('.')) return
  if (e.key === '-' && e.target.selectionStart === 0 && !String(props.modelValue).includes('-'))
    return
  if (e.ctrlKey || e.metaKey) return // allow copy/paste/select-all

  // Block non-digit keys
  if (!/^\d$/.test(e.key)) {
    e.preventDefault()
  }
}

function stepUp() {
  const current = Number(props.modelValue) || 0
  let next = current + (props.step ?? 1)
  if (props.max !== undefined) next = Math.min(next, props.max)
  emit('update:modelValue', next)
}

function stepDown() {
  const current = Number(props.modelValue) || 0
  let next = current - (props.step ?? 1)
  if (props.min !== undefined) next = Math.max(next, props.min)
  emit('update:modelValue', next)
}

// Expose focus method
defineExpose({
  focus: () => inputRef.value?.focus(),
  el: inputRef,
})
</script>

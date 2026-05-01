<template>
  <div class="space-y-3">
    <!-- Canvas area -->
    <div
      class="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mx-auto"
      :style="{ width: canvasSize + 'px', height: canvasSize + 'px' }"
    >
      <canvas
        ref="canvasRef"
        :width="canvasSize"
        :height="canvasSize"
        class="cursor-grab active:cursor-grabbing touch-none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @wheel.prevent="onWheel"
      />
      <!-- Circular overlay mask -->
      <div
        class="absolute inset-0 pointer-events-none"
        :style="{ boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.45)', borderRadius: '50%' }"
      />
    </div>

    <!-- Controls -->
    <div class="space-y-2">
      <!-- Zoom -->
      <div class="flex items-center gap-2">
        <Icon name="mdi:magnify-minus-outline" class="w-4 h-4 text-gray-400 flex-shrink-0" />
        <UiSlider
          v-model="scale"
          :min="minScale"
          :max="maxScale"
          :step="0.01"
          width="flex"
          @input="draw"
        />
        <Icon name="mdi:magnify-plus-outline" class="w-4 h-4 text-gray-400 flex-shrink-0" />
        <UiInput
          type="number"
          :model-value="scaleDisplay"
          :min="Math.round(minScale * 100)"
          :max="Math.round(maxScale * 100)"
          :step="1"
          stepper-layout="stacked-right"
          :validate="false"
          class="!w-16 flex-shrink-0 text-center"
          @update:model-value="onScaleInput"
        />
      </div>

      <!-- Rotate -->
      <div class="flex items-center gap-2">
        <Icon name="mdi:rotate-left" class="w-4 h-4 text-gray-400 flex-shrink-0" />
        <UiSlider v-model="rotation" :min="-180" :max="180" :step="1" width="flex" @input="draw" />
        <Icon name="mdi:rotate-right" class="w-4 h-4 text-gray-400 flex-shrink-0" />
        <UiInput
          type="number"
          :model-value="rotation"
          :min="-180"
          :max="180"
          :step="1"
          stepper-layout="stacked-right"
          :validate="false"
          class="!w-16 flex-shrink-0 text-center"
          @update:model-value="onRotationInput"
        />
      </div>

      <!-- Quick rotate & reset buttons -->
      <div class="flex items-center justify-center gap-2">
        <UiButton variant="solid" color="gray" size="xs" @click="rotateBy(-90)"> -90° </UiButton>
        <UiButton variant="solid" color="gray" size="xs" @click="resetAll"> Reset </UiButton>
        <UiButton variant="solid" color="gray" size="xs" @click="rotateBy(90)"> +90° </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  imageSource: { type: String, required: true },
  outputSize: { type: Number, default: 256 },
  canvasSize: { type: Number, default: 220 },
})

const emit = defineEmits(['update'])

const canvasRef = ref(null)
const img = ref(null)
const scale = ref(1)
const minScale = ref(0.2)
const maxScale = ref(3)
const rotation = ref(0)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
const lastPointer = ref({ x: 0, y: 0 })
const initialScale = ref(1)

// Scale displayed as percentage for the number input
const scaleDisplay = computed(() => Math.round(scale.value * 100))

const onScaleInput = (val) => {
  const n = Number(val)
  if (Number.isFinite(n)) {
    scale.value = Math.min(maxScale.value, Math.max(minScale.value, n / 100))
    draw()
  }
}

const onRotationInput = (val) => {
  const n = Number(val)
  if (Number.isFinite(n)) {
    rotation.value = Math.min(180, Math.max(-180, n))
    draw()
  }
}

const resetAll = () => {
  scale.value = initialScale.value
  rotation.value = 0
  panX.value = 0
  panY.value = 0
  draw()
}

// Load image
watch(
  () => props.imageSource,
  (src) => {
    if (!src) return
    const image = new Image()
    image.onload = () => {
      img.value = image
      // Fit image to canvas
      const fitScale = props.canvasSize / Math.min(image.width, image.height)
      scale.value = fitScale
      initialScale.value = fitScale
      minScale.value = fitScale * 0.5
      maxScale.value = fitScale * 3
      panX.value = 0
      panY.value = 0
      rotation.value = 0
      draw()
    }
    image.src = src
  },
  { immediate: true },
)

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas || !img.value) return
  const ctx = canvas.getContext('2d')
  const size = props.canvasSize
  const cx = size / 2
  const cy = size / 2

  ctx.clearRect(0, 0, size, size)
  ctx.save()
  ctx.translate(cx + panX.value, cy + panY.value)
  ctx.rotate((rotation.value * Math.PI) / 180)
  ctx.scale(scale.value, scale.value)
  ctx.drawImage(img.value, -img.value.width / 2, -img.value.height / 2)
  ctx.restore()

  emitCropped()
}

const emitCropped = () => {
  const canvas = canvasRef.value
  if (!canvas || !img.value) return

  // Create output canvas with circular crop
  const out = document.createElement('canvas')
  const outSize = props.outputSize
  out.width = outSize
  out.height = outSize
  const ctx = out.getContext('2d')
  const ratio = outSize / props.canvasSize

  // Clip to circle
  ctx.beginPath()
  ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  // Draw the same transform scaled to output
  const cx = outSize / 2
  const cy = outSize / 2
  ctx.translate(cx + panX.value * ratio, cy + panY.value * ratio)
  ctx.rotate((rotation.value * Math.PI) / 180)
  const s = scale.value * ratio
  ctx.scale(s, s)
  ctx.drawImage(img.value, -img.value.width / 2, -img.value.height / 2)

  emit('update', out.toDataURL('image/webp', 0.85))
}

const onPointerDown = (e) => {
  dragging.value = true
  lastPointer.value = { x: e.clientX, y: e.clientY }
  e.target.setPointerCapture(e.pointerId)
}

const onPointerMove = (e) => {
  if (!dragging.value) return
  panX.value += e.clientX - lastPointer.value.x
  panY.value += e.clientY - lastPointer.value.y
  lastPointer.value = { x: e.clientX, y: e.clientY }
  draw()
}

const onPointerUp = () => {
  dragging.value = false
}

const onWheel = (e) => {
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  scale.value = Math.min(maxScale.value, Math.max(minScale.value, scale.value + delta))
  draw()
}

const rotateBy = (deg) => {
  rotation.value = ((rotation.value + deg + 180) % 360) - 180
  draw()
}
</script>

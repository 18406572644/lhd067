<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useEditorStore } from '~/stores/editor'
import {
  removeBackgroundKmeans,
  applyFeather,
  applyBrushStroke,
  dataUrlToCanvas,
  createInitialMask
} from '~/utils/imageProcess'
import { Eraser, Hand, RotateCcw, Eye, EyeOff } from 'lucide-vue-next'

const props = defineProps<{
  visible?: boolean
}>()

const emit = defineEmits<{
  'apply': [dataUrl: string]
  'cancel': []
}>()

const editorStore = useEditorStore()

const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const isProcessing = ref(false)
const isDrawing = ref(false)
const lastDrawPoint = ref<{ x: number; y: number } | null>(null)
const originalCanvas = ref<HTMLCanvasElement | null>(null)
const workingCanvas = ref<HTMLCanvasElement | null>(null)
const currentMask = ref<Uint8ClampedArray | null>(null)
const currentObjectId = ref<string | null>(null)

const bgRemoval = computed(() => editorStore.bgRemoval)
const selectedObject = computed(() => {
  if (!editorStore.selectedObjectId) return null
  return editorStore.canvasObjects.find(o => o.id === editorStore.selectedObjectId) || null
})

const hasImage = computed(() => {
  return selectedObject.value && selectedObject.value.type === 'uploaded'
})

let previewCtx: CanvasRenderingContext2D | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function initFromSelected() {
  if (!selectedObject.value?.imageData) return

  if (currentObjectId.value === selectedObject.value.id && originalCanvas.value) {
    await renderPreview()
    return
  }

  isProcessing.value = true
  try {
    const canvas = await dataUrlToCanvas(selectedObject.value.imageData)
    originalCanvas.value = canvas
    workingCanvas.value = canvas
    currentMask.value = createInitialMask(canvas.width, canvas.height)
    currentObjectId.value = selectedObject.value.id

    editorStore.setBgRemovalOriginalImage(selectedObject.value.imageData)
    editorStore.setBgRemovalProcessedImage(selectedObject.value.imageData)
    editorStore.setBgRemovalMask(currentMask.value)

    await renderPreview()
  } finally {
    isProcessing.value = false
  }
}

async function renderPreview() {
  if (!previewCanvasRef.value || !workingCanvas.value) return

  if (!previewCtx) {
    previewCtx = previewCanvasRef.value.getContext('2d')
  }

  const canvas = previewCanvasRef.value
  const imgCanvas = workingCanvas.value

  const maxW = 280
  const maxH = 280
  let w = imgCanvas.width
  let h = imgCanvas.height
  const scale = Math.min(maxW / w, maxH / h, 1)
  w = Math.round(w * scale)
  h = Math.round(h * scale)

  canvas.width = w
  canvas.height = h
  previewCtx!.clearRect(0, 0, w, h)

  const checkerSize = 8
  for (let y = 0; y < h; y += checkerSize) {
    for (let x = 0; x < w; x += checkerSize) {
      previewCtx!.fillStyle = ((x / checkerSize + y / checkerSize) % 2 === 0) ? '#e5e5e5' : '#ffffff'
      previewCtx!.fillRect(x, y, checkerSize, checkerSize)
    }
  }

  const displayImage = bgRemoval.value.isComparing && originalCanvas.value
    ? originalCanvas.value
    : workingCanvas.value

  previewCtx!.drawImage(displayImage, 0, 0, w, h)
}

async function runAutoRemoval() {
  if (!originalCanvas.value) return

  isProcessing.value = true
  try {
    const tolerance = bgRemoval.value.tolerance
    const { canvas: kmeansCanvas, mask } = removeBackgroundKmeans(originalCanvas.value, tolerance)

    const featheredCanvas = applyFeather(kmeansCanvas, mask, bgRemoval.value.feather)

    workingCanvas.value = featheredCanvas
    currentMask.value = mask

    const dataUrl = featheredCanvas.toDataURL('image/png')
    editorStore.setBgRemovalProcessedImage(dataUrl)
    editorStore.setBgRemovalMask(mask)

    await renderPreview()
  } finally {
    isProcessing.value = false
  }
}

function debouncedAutoRemoval() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    runAutoRemoval()
  }, 200)
}

async function handleFeatherChange() {
  if (!originalCanvas.value || !currentMask.value) return
  if (bgRemoval.value.mode !== 'auto') return

  isProcessing.value = true
  try {
    const { canvas: kmeansCanvas } = removeBackgroundKmeans(originalCanvas.value, bgRemoval.value.tolerance)
    const featheredCanvas = applyFeather(kmeansCanvas, currentMask.value, bgRemoval.value.feather)

    workingCanvas.value = featheredCanvas
    const dataUrl = featheredCanvas.toDataURL('image/png')
    editorStore.setBgRemovalProcessedImage(dataUrl)

    await renderPreview()
  } finally {
    isProcessing.value = false
  }
}

function debouncedFeatherChange() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    handleFeatherChange()
  }, 200)
}

function getCanvasPoint(e: MouseEvent | Touch): { x: number; y: number } {
  const canvas = previewCanvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  const originalScaleX = (workingCanvas.value?.width || 1) / canvas.width
  const originalScaleY = (workingCanvas.value?.height || 1) / canvas.height

  return {
    x: (e.clientX - rect.left) * scaleX * originalScaleX,
    y: (e.clientY - rect.top) * scaleY * originalScaleY
  }
}

function drawLine(from: { x: number; y: number }, to: { x: number; y: number }) {
  if (!workingCanvas.value || !currentMask.value) return

  const points: { x: number; y: number }[] = []
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const steps = Math.max(1, Math.ceil(dist / 2))

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push({
      x: from.x + dx * t,
      y: from.y + dy * t
    })
  }

  const { canvas: newCanvas, mask: newMask } = applyBrushStroke(
    workingCanvas.value,
    currentMask.value,
    points,
    bgRemoval.value.brushSize,
    bgRemoval.value.brushMode
  )

  workingCanvas.value = newCanvas
  currentMask.value = newMask

  if (bgRemoval.value.feather > 0 && originalCanvas.value) {
    const featheredCanvas = applyFeather(newCanvas, newMask, bgRemoval.value.feather)
    workingCanvas.value = featheredCanvas
  }

  const dataUrl = workingCanvas.value.toDataURL('image/png')
  editorStore.setBgRemovalProcessedImage(dataUrl)
  editorStore.setBgRemovalMask(newMask)

  renderPreview()
}

function handleMouseDown(e: MouseEvent) {
  if (bgRemoval.value.mode !== 'manual' || !workingCanvas.value) return
  isDrawing.value = true
  const point = getCanvasPoint(e)
  lastDrawPoint.value = point
  drawLine(point, point)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDrawing.value || !lastDrawPoint.value) return
  const point = getCanvasPoint(e)
  drawLine(lastDrawPoint.value, point)
  lastDrawPoint.value = point
}

function handleMouseUp() {
  isDrawing.value = false
  lastDrawPoint.value = null
}

function handleTouchStart(e: TouchEvent) {
  if (bgRemoval.value.mode !== 'manual' || !workingCanvas.value) return
  e.preventDefault()
  isDrawing.value = true
  const point = getCanvasPoint(e.touches[0])
  lastDrawPoint.value = point
  drawLine(point, point)
}

function handleTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (!isDrawing.value || !lastDrawPoint.value) return
  const point = getCanvasPoint(e.touches[0])
  drawLine(lastDrawPoint.value, point)
  lastDrawPoint.value = point
}

function handleTouchEnd() {
  isDrawing.value = false
  lastDrawPoint.value = null
}

async function handleReset() {
  if (!originalCanvas.value) return

  isProcessing.value = true
  try {
    editorStore.resetBgRemoval()
    workingCanvas.value = originalCanvas.value
    currentMask.value = createInitialMask(originalCanvas.value.width, originalCanvas.value.height)
    editorStore.setBgRemovalMask(currentMask.value)
    await renderPreview()
  } finally {
    isProcessing.value = false
  }
}

function handleApply() {
  if (bgRemoval.value.processedImageData) {
    emit('apply', bgRemoval.value.processedImageData)
  }
}

function handleCompareStart() {
  editorStore.setBgRemovalComparing(true)
  renderPreview()
}

function handleCompareEnd() {
  editorStore.setBgRemovalComparing(false)
  renderPreview()
}

watch(
  () => bgRemoval.value.tolerance,
  () => {
    if (bgRemoval.value.mode === 'auto' && originalCanvas.value) {
      debouncedAutoRemoval()
    }
  }
)

watch(
  () => bgRemoval.value.feather,
  () => {
    if (currentMask.value && originalCanvas.value) {
      debouncedFeatherChange()
    }
  }
)

watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      await nextTick()
      if (hasImage.value && selectedObject.value?.id !== currentObjectId.value) {
        await initFromSelected()
      } else if (workingCanvas.value) {
        await renderPreview()
      }
    }
  }
)

watch(
  () => editorStore.selectedObjectId,
  async () => {
    if (hasImage.value) {
      await nextTick()
      await initFromSelected()
    }
  }
)

onMounted(async () => {
  if (hasImage.value && props.visible) {
    await initFromSelected()
  }
})
</script>

<template>
  <div class="w-72 max-h-[80vh] overflow-y-auto bg-white/60 backdrop-blur rounded-2xl border border-herb-brown-light/30 p-4">
    <h2 class="font-display text-herb-brown text-lg mb-4">背景去除</h2>

    <div v-if="!hasImage" class="text-center py-6 text-herb-brown/50 text-sm">
      <p class="mb-2">请先选择一张上传的图片</p>
      <p class="text-xs">点击素材面板上传图片后再选择</p>
    </div>

    <div v-else class="space-y-4">
      <div class="relative rounded-xl overflow-hidden bg-gray-100 border border-herb-brown-light/20">
        <canvas
          ref="previewCanvasRef"
          class="w-full h-auto cursor-crosshair"
          :class="{ 'pointer-events-none': bgRemoval.mode !== 'manual' }"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        />
        <div
          v-if="isProcessing"
          class="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm"
        >
          <div class="w-6 h-6 border-2 border-herb-green border-t-transparent rounded-full animate-spin" />
        </div>
        <div v-if="bgRemoval.isComparing" class="absolute top-2 left-2 px-2 py-1 bg-herb-brown/80 text-white text-xs rounded">
          原图
        </div>
      </div>

      <div class="flex gap-1 bg-white/50 rounded-xl p-1">
        <button
          :class="[
            'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-sm font-medium rounded-lg transition-all',
            bgRemoval.mode === 'auto'
              ? 'bg-herb-green/80 text-herb-brown'
              : 'text-herb-brown/60 hover:bg-herb-green/30'
          ]"
          @click="editorStore.setBgRemovalMode('auto')"
        >
          <Eraser :size="14" />
          自动
        </button>
        <button
          :class="[
            'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-sm font-medium rounded-lg transition-all',
            bgRemoval.mode === 'manual'
              ? 'bg-herb-green/80 text-herb-brown'
              : 'text-herb-brown/60 hover:bg-herb-green/30'
          ]"
          @click="editorStore.setBgRemovalMode('manual')"
        >
          <Hand :size="14" />
          手动
        </button>
      </div>

      <div v-if="bgRemoval.mode === 'auto'" class="space-y-3">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-herb-brown/70">容差</label>
            <span class="text-xs text-herb-brown/60">{{ bgRemoval.tolerance }}</span>
          </div>
          <el-slider
            :model-value="bgRemoval.tolerance"
            :min="0"
            :max="100"
            @input="(val: number) => editorStore.setBgRemovalTolerance(val)"
          />
          <p class="text-xs text-herb-brown/40 mt-1">数值越大去除的背景越多</p>
        </div>

        <button
          class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-herb-green/80 hover:bg-herb-green text-herb-brown font-medium rounded-xl transition-all text-sm"
          :disabled="isProcessing"
          @click="runAutoRemoval"
        >
          <Eraser :size="16" />
          {{ isProcessing ? '处理中...' : '开始抠图' }}
        </button>
      </div>

      <div v-else class="space-y-3">
        <div class="flex gap-1 bg-white/50 rounded-xl p-1">
          <button
            :class="[
              'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all',
              bgRemoval.brushMode === 'keep'
                ? 'bg-green-500/80 text-white'
                : 'text-herb-brown/60 hover:bg-green-500/20'
            ]"
            @click="editorStore.setBgRemovalBrushMode('keep')"
          >
            保留区域
          </button>
          <button
            :class="[
              'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all',
              bgRemoval.brushMode === 'remove'
                ? 'bg-red-500/80 text-white'
                : 'text-herb-brown/60 hover:bg-red-500/20'
            ]"
            @click="editorStore.setBgRemovalBrushMode('remove')"
          >
            去除区域
          </button>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-herb-brown/70">画笔大小</label>
            <span class="text-xs text-herb-brown/60">{{ bgRemoval.brushSize }}px</span>
          </div>
          <el-slider
            :model-value="bgRemoval.brushSize"
            :min="5"
            :max="80"
            @input="(val: number) => editorStore.setBgRemovalBrushSize(val)"
          />
        </div>

        <p class="text-xs text-herb-brown/40">
          在预览图上涂抹：<span class="text-green-600">绿色画笔</span> 保留，<span class="text-red-600">红色画笔</span> 去除
        </p>
      </div>

      <div class="pt-2 border-t border-herb-brown-light/20">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-herb-brown/70">羽化边缘</label>
            <span class="text-xs text-herb-brown/60">{{ bgRemoval.feather }}px</span>
          </div>
          <el-slider
            :model-value="bgRemoval.feather"
            :min="0"
            :max="20"
            @input="(val: number) => editorStore.setBgRemovalFeather(val)"
          />
          <p class="text-xs text-herb-brown/40 mt-1">使抠图边缘更柔和自然</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          class="flex items-center justify-center gap-1 px-3 py-2 bg-white/80 hover:bg-white text-herb-brown/70 border border-herb-brown-light/30 rounded-xl transition-all text-sm"
          @mousedown="handleCompareStart"
          @mouseup="handleCompareEnd"
          @mouseleave="handleCompareEnd"
          @touchstart.prevent="handleCompareStart"
          @touchend.prevent="handleCompareEnd"
        >
          <component :is="bgRemoval.isComparing ? EyeOff : Eye" :size="14" />
          对比
        </button>
        <button
          class="flex items-center justify-center gap-1 px-3 py-2 bg-white/80 hover:bg-white text-herb-brown/70 border border-herb-brown-light/30 rounded-xl transition-all text-sm"
          @click="handleReset"
        >
          <RotateCcw :size="14" />
          重置
        </button>
      </div>

      <button
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-herb-brown hover:bg-herb-brown/90 text-white font-medium rounded-xl transition-all"
        :disabled="isProcessing || !bgRemoval.processedImageData"
        @click="handleApply"
      >
        应用到画布
      </button>
    </div>
  </div>
</template>

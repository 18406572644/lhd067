<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import type { CanvasObjectData, SpecimenLabel, ExportSettings } from '~/types'

const props = defineProps<{
  canvasObjects?: CanvasObjectData[]
  labels?: SpecimenLabel[]
  showBorder?: boolean
  borderStyle?: 'none' | 'simple' | 'botanical'
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

let fabric: any = null
let canvas: any = null
let resizeObserver: ResizeObserver | null = null

const A4_RATIO = 210 / 297

async function waitForFabric(maxAttempts = 100, intervalMs = 50): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const w = window as any
    if (w.fabric && typeof w.fabric.Canvas === 'function') {
      return w.fabric
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return null
}

async function initCanvas() {
  if (!import.meta.client || !canvasRef.value || !containerRef.value) return

  try {
    fabric = await waitForFabric()
    if (!fabric) return

    const containerWidth = containerRef.value.clientWidth
    const canvasHeight = containerWidth / A4_RATIO

    canvas = new fabric.StaticCanvas(canvasRef.value, {
      backgroundColor: '#FAF8F5',
      width: containerWidth,
      height: canvasHeight
    })

    resizeObserver = new ResizeObserver(() => {
      if (!canvas || !containerRef.value) return
      const w = containerRef.value.clientWidth
      const h = w / A4_RATIO
      const scale = w / canvas.getWidth()
      canvas.setDimensions({ width: w, height: h })
      canvas.setZoom(scale)
      canvas.renderAll()
    })
    resizeObserver.observe(containerRef.value)

    renderContent()
  } catch (e) {
    console.error('[A4Preview] init error:', e)
  }
}

async function renderContent() {
  if (!canvas || !fabric) return

  canvas.clear()
  canvas.setBackgroundColor('#FAF8F5', () => {})

  const objects = props.canvasObjects || []
  for (const objData of objects) {
    try {
      if (objData.type === 'material' && objData.svgData) {
        const group = await new Promise<any>((resolve) => {
          fabric.loadSVGFromString(objData.svgData, (objs: any[], opts: any) => {
            resolve(fabric.util.groupSVGElements(objs, opts))
          })
        })
        if (group) {
          group.set({
            left: objData.x,
            top: objData.y,
            scaleX: objData.scaleX,
            scaleY: objData.scaleY,
            angle: objData.angle,
            opacity: objData.opacity,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
          })
          canvas.add(group)
        }
      } else if (objData.type === 'uploaded' && objData.imageData) {
        const img = await new Promise<any>((resolve) => {
          fabric.Image.fromURL(objData.imageData, (i: any) => resolve(i), { crossOrigin: 'anonymous' })
        })
        if (img) {
          img.set({
            left: objData.x,
            top: objData.y,
            scaleX: objData.scaleX,
            scaleY: objData.scaleY,
            angle: objData.angle,
            opacity: objData.opacity,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
          })
          canvas.add(img)
        }
      }
    } catch (e) {
      console.error('[A4Preview] Error rendering object:', objData.id, e)
    }
  }

  if (props.showBorder && props.borderStyle && props.borderStyle !== 'none') {
    addBorder()
  }

  canvas.renderAll()
}

function addBorder() {
  if (!canvas || !fabric) return

  const width = canvas.getWidth()
  const height = canvas.getHeight()
  const padding = width * 0.04

  if (props.borderStyle === 'simple') {
    const rect = new fabric.Rect({
      left: padding,
      top: padding,
      width: width - padding * 2,
      height: height - padding * 2,
      fill: 'transparent',
      stroke: '#B8A88A',
      strokeWidth: 1.5,
      selectable: false,
      evented: false
    })
    canvas.add(rect)
  } else if (props.borderStyle === 'botanical') {
    const outerRect = new fabric.Rect({
      left: padding,
      top: padding,
      width: width - padding * 2,
      height: height - padding * 2,
      fill: 'transparent',
      stroke: '#B8A88A',
      strokeWidth: 1,
      selectable: false,
      evented: false
    })
    canvas.add(outerRect)

    const innerPadding = padding * 1.5
    const innerRect = new fabric.Rect({
      left: innerPadding,
      top: innerPadding,
      width: width - innerPadding * 2,
      height: height - innerPadding * 2,
      fill: 'transparent',
      stroke: '#B8A88A',
      strokeWidth: 0.5,
      selectable: false,
      evented: false
    })
    canvas.add(innerRect)

    const cornerSize = padding * 1.2
    const cornerPositions = [
      { x: padding, y: padding, angle: 0 },
      { x: width - padding, y: padding, angle: 90 },
      { x: width - padding, y: height - padding, angle: 180 },
      { x: padding, y: height - padding, angle: 270 }
    ]

    cornerPositions.forEach(pos => {
      const path = new fabric.Path(
        `M 0 ${cornerSize * 0.6} L 0 0 L ${cornerSize * 0.6} 0`,
        {
          left: pos.x,
          top: pos.y,
          angle: pos.angle,
          stroke: '#8B7355',
          strokeWidth: 1.5,
          fill: 'transparent',
          selectable: false,
          evented: false
        }
      )
      canvas.add(path)
    })
  }
}

function getHighResExport(settings: ExportSettings): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!canvas || !fabric) {
      reject(new Error('Canvas not initialized'))
      return
    }

    try {
      const dpi = settings.dpi || 300
      const a4WidthPx = (dpi * 210) / 25.4
      const a4HeightPx = (dpi * 297) / 25.4
      const multiplier = a4WidthPx / canvas.getWidth()

      const dataUrl = canvas.toDataURL({
        format: settings.format === 'jpg' ? 'jpeg' : 'png',
        multiplier: multiplier,
        quality: 0.95
      })

      const byteString = atob(dataUrl.split(',')[1])
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }

      resolve(new Blob([ab], { type: mimeString }))
    } catch (e) {
      reject(e)
    }
  })
}

defineExpose({
  get canvas() { return canvas },
  getHighResExport,
  renderContent
})

onMounted(() => {
  if (import.meta.client) {
    initCanvas()
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  canvas?.dispose()
})

watch(
  () => [props.canvasObjects, props.showBorder, props.borderStyle],
  () => {
    if (canvas && fabric) {
      renderContent()
    }
  },
  { deep: true }
)
</script>

<template>
  <div class="flex flex-col items-center w-full">
    <div
      ref="containerRef"
      class="relative w-full max-w-[420px] shadow-2xl rounded-sm overflow-hidden paper-texture"
      :class="[
        showBorder && borderStyle === 'simple' ? 'border border-herb-brown-light/30' : '',
        showBorder && borderStyle === 'botanical' ? 'border border-herb-brown-light/40' : ''
      ]"
    >
      <canvas ref="canvasRef" class="block w-full" />
    </div>
    <p class="text-xs text-herb-brown/40 mt-3 font-serif">
      A4 竖版 · 210mm × 297mm
    </p>
  </div>
</template>

<style scoped>
.paper-texture {
  background-image:
    linear-gradient(135deg, rgba(107, 91, 78, 0.015) 0%, transparent 50%),
    radial-gradient(ellipse at 30% 20%, rgba(245, 240, 232, 0.3) 0%, transparent 50%);
  background-color: #FAF8F5;
}
</style>
